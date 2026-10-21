import { FilterQuery, Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { IUser, UserRole } from '../user/user.model';
import { Machine } from '../machine/machine.model';
import {
  ProductionSheet,
  IProductionSheet,
  IProductionEntry,
  SafeProductionSheet,
  toSafeProductionSheet,
  ShiftType,
  ProductionSheetStatus,
  EfficiencyMode,
  ProductionMachineStatus,
} from './production.model';
import {
  SaveProductionSheetInput,
  UpdateProductionSheetInput,
  QueryProductionSheetInput,
} from './production.validation';
import {
  normalizeProductionDate,
  getShiftTimings,
  calculateTheoreticalProduction,
  calculateEfficiency,
  computeSheetTotals,
} from './production.utils';

export interface ProductionSheetPaginationResult {
  sheets: SafeProductionSheet[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export class ProductionService {
  // ─── Resolve Effective Factory ID ──────────────────────────────────────────
  public static resolveFactoryId(actor: IUser, explicitFactoryId?: string): Types.ObjectId {
    if (actor.role === UserRole.SUPER_ADMIN) {
      if (explicitFactoryId) {
        if (!Types.ObjectId.isValid(explicitFactoryId)) {
          throw new ApiError(400, 'Invalid factoryId format');
        }
        return new Types.ObjectId(explicitFactoryId);
      }
      if (actor.factoryId) {
        return actor.factoryId;
      }
      throw new ApiError(400, 'Super admin must specify factoryId context for production sheet operations');
    }

    if (!actor.factoryId) {
      throw new ApiError(403, 'User is not assigned to a factory');
    }

    return actor.factoryId;
  }

  // ─── Get By Date and Shift ──────────────────────────────────────────────────
  static async getByDateAndShift(
    actor: IUser,
    dateStr: string,
    shift: ShiftType,
    explicitFactoryId?: string,
  ): Promise<SafeProductionSheet | null> {
    const factoryId = this.resolveFactoryId(actor, explicitFactoryId);
    const prodDate = normalizeProductionDate(dateStr);

    const sheet = await ProductionSheet.findOne({
      factoryId,
      productionDate: prodDate,
      shift,
    });

    if (!sheet) {
      return null;
    }

    return toSafeProductionSheet(sheet);
  }

  // ─── Get Sheet By ID ────────────────────────────────────────────────────────
  static async getSheetById(
    id: string,
    actor: IUser,
    explicitFactoryId?: string,
  ): Promise<SafeProductionSheet> {
    const factoryId = this.resolveFactoryId(actor, explicitFactoryId);

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid production sheet ID format');
    }

    const sheet = await ProductionSheet.findOne({
      _id: new Types.ObjectId(id),
      factoryId,
    });

    if (!sheet) {
      throw new ApiError(404, 'Production sheet not found');
    }

    return toSafeProductionSheet(sheet);
  }

  // ─── Save / Create Production Sheet ─────────────────────────────────────────
  static async saveSheet(
    input: SaveProductionSheetInput,
    actor: IUser,
    explicitFactoryId?: string,
  ): Promise<SafeProductionSheet> {
    const factoryId = this.resolveFactoryId(actor, explicitFactoryId);
    const prodDate = normalizeProductionDate(input.productionDate);

    // 1. Prevent invalid future dates (allow up to +1 day for night shift advance prep)
    const now = new Date();
    const maxFutureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (prodDate > maxFutureDate) {
      throw new ApiError(400, 'Cannot record production for future dates');
    }

    // 2. Calculate shift timings
    const timings = getShiftTimings(input.productionDate, input.shift);

    // 3. Prevent duplicate machine entries within the same sheet
    const machineIdSet = new Set(input.entries.map((e) => e.machineId));
    if (machineIdSet.size !== input.entries.length) {
      throw new ApiError(400, 'Duplicate machine entries for the same machine in the same shift are not permitted');
    }

    // 4. Validate all machines exist and belong to the authorized factory
    const machineObjectIds = input.entries.map((e) => new Types.ObjectId(e.machineId));
    const machines = await Machine.find({
      _id: { $in: machineObjectIds },
      factoryId,
    }).populate('fabricId');

    if (machines.length !== machineObjectIds.length) {
      throw new ApiError(404, 'One or more referenced machines do not exist or belong to another factory');
    }

    const machineMap = new Map<string, (typeof machines)[0]>();
    for (const m of machines) {
      machineMap.set(m._id.toString(), m);
    }

    // 5. Build and validate entries with snapshots and calculations
    const processedEntries: IProductionEntry[] = [];

    for (const entryInput of input.entries) {
      const machine = machineMap.get(entryInput.machineId);
      if (!machine) {
        throw new ApiError(404, `Machine ID ${entryInput.machineId} not found`);
      }

      // Snapshot machine status
      let machineStatusSnapshot = ProductionMachineStatus.RUNNING;
      if (machine.status === 'STOPPED') {
        machineStatusSnapshot = ProductionMachineStatus.STOPPED;
      } else if (machine.status === 'MAINTENANCE') {
        machineStatusSnapshot = ProductionMachineStatus.MAINTENANCE;
      }

      // Snapshot fabric
      let fabricId: Types.ObjectId | undefined;
      let fabricNameSnapshot = 'NOT_ASSIGNED';
      let fabricCodeSnapshot: string | undefined;

      if (machine.fabricId) {
        const fab = machine.fabricId as unknown as { _id: Types.ObjectId; name: string; code: string };
        if (fab && fab.name) {
          fabricId = fab._id;
          fabricNameSnapshot = fab.name;
          fabricCodeSnapshot = fab.code;
        } else if (Types.ObjectId.isValid(machine.fabricId as unknown as string)) {
          fabricId = machine.fabricId as unknown as Types.ObjectId;
          fabricNameSnapshot = 'ASSIGNED';
        }
      }

      const rpmSnapshot = machine.rpm;
      const ppiSnapshot = machine.ppi;
      const shiftDurationHours = timings.durationHours;

      // Theoretical Production calculation
      const theoreticalProductionMeters = calculateTheoreticalProduction(
        rpmSnapshot,
        ppiSnapshot,
        shiftDurationHours,
      );

      // Efficiency Calculation & Mode
      let efficiencyPercent: number | null = null;

      if (entryInput.efficiencyMode === EfficiencyMode.MANUAL) {
        if (
          entryInput.efficiencyPercent === undefined ||
          entryInput.efficiencyPercent === null ||
          typeof entryInput.efficiencyPercent !== 'number'
        ) {
          throw new ApiError(
            400,
            `Manual efficiency percentage is required for machine ${machine.machineNumber} in MANUAL mode`,
          );
        }
        efficiencyPercent = Number(entryInput.efficiencyPercent.toFixed(2));
      } else {
        // AUTO Mode
        if (theoreticalProductionMeters === null || theoreticalProductionMeters <= 0) {
          throw new ApiError(
            400,
            `Machine ${machine.machineNumber} has invalid RPM (${rpmSnapshot}) or PPI (${ppiSnapshot}) for automatic calculation. Correct machine configuration or switch to MANUAL mode.`,
          );
        }
        efficiencyPercent = calculateEfficiency(
          entryInput.actualProductionMeters,
          theoreticalProductionMeters,
        );
      }

      processedEntries.push({
        _id: new Types.ObjectId(),
        machineId: machine._id,
        machineNumberSnapshot: machine.machineNumber,
        machineNameSnapshot: machine.name,
        fabricId,
        fabricNameSnapshot,
        fabricCodeSnapshot,
        shift: input.shift,
        productionDate: prodDate,
        actualProductionMeters: Number(entryInput.actualProductionMeters.toFixed(2)),
        efficiencyMode: entryInput.efficiencyMode,
        efficiencyPercent,
        rpmSnapshot,
        ppiSnapshot,
        shiftDurationHours,
        theoreticalProductionMeters,
        machineStatusSnapshot,
        notes: entryInput.notes?.trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IProductionEntry);
    }

    // 6. Compute aggregate totals
    const totals = computeSheetTotals(processedEntries);

    // 7. Check if sheet already exists for this factory, date, and shift
    const existing = await ProductionSheet.findOne({
      factoryId,
      productionDate: prodDate,
      shift: input.shift,
    });

    if (existing) {
      // If completed, only allowed roles can update or it must be reopened
      if (existing.status === ProductionSheetStatus.COMPLETED) {
        if (actor.role === UserRole.VIEWER || actor.role === UserRole.OPERATOR) {
          throw new ApiError(
            403,
            'This production sheet has been completed and locked. An administrator or manager must reopen it for edits.',
          );
        }
      }

      existing.entries = processedEntries as unknown as Types.DocumentArray<IProductionEntry>;
      existing.totalProductionMeters = totals.totalProductionMeters;
      existing.runningMachineCount = totals.runningMachineCount;
      existing.stoppedMachineCount = totals.stoppedMachineCount;
      existing.maintenanceMachineCount = totals.maintenanceMachineCount;
      existing.averageEfficiency = totals.averageEfficiency;
      if (input.notes !== undefined) {
        existing.notes = input.notes.trim() || undefined;
      }
      existing.updatedBy = actor._id;

      if (input.status === ProductionSheetStatus.COMPLETED) {
        existing.status = ProductionSheetStatus.COMPLETED;
        existing.completedAt = new Date();
        existing.completedBy = actor._id;
      } else if (input.status === ProductionSheetStatus.DRAFT) {
        existing.status = ProductionSheetStatus.DRAFT;
      }

      await existing.save();
      return toSafeProductionSheet(existing);
    }

    // 8. Create new sheet
    const newSheet = await ProductionSheet.create({
      factoryId,
      productionDate: prodDate,
      shift: input.shift,
      shiftStart: timings.shiftStart,
      shiftEnd: timings.shiftEnd,
      shiftDurationHours: timings.durationHours,
      entries: processedEntries,
      totalProductionMeters: totals.totalProductionMeters,
      runningMachineCount: totals.runningMachineCount,
      stoppedMachineCount: totals.stoppedMachineCount,
      maintenanceMachineCount: totals.maintenanceMachineCount,
      averageEfficiency: totals.averageEfficiency,
      notes: input.notes?.trim() || undefined,
      status: input.status || ProductionSheetStatus.DRAFT,
      createdBy: actor._id,
      updatedBy: actor._id,
      completedAt: input.status === ProductionSheetStatus.COMPLETED ? new Date() : undefined,
      completedBy: input.status === ProductionSheetStatus.COMPLETED ? actor._id : undefined,
    });

    return toSafeProductionSheet(newSheet);
  }

  // ─── Complete Sheet ─────────────────────────────────────────────────────────
  static async completeSheet(
    id: string,
    actor: IUser,
    explicitFactoryId?: string,
  ): Promise<SafeProductionSheet> {
    const factoryId = this.resolveFactoryId(actor, explicitFactoryId);

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid production sheet ID format');
    }

    const sheet = await ProductionSheet.findOne({
      _id: new Types.ObjectId(id),
      factoryId,
    });

    if (!sheet) {
      throw new ApiError(404, 'Production sheet not found');
    }

    sheet.status = ProductionSheetStatus.COMPLETED;
    sheet.completedAt = new Date();
    sheet.completedBy = actor._id;
    sheet.updatedBy = actor._id;

    await sheet.save();
    return toSafeProductionSheet(sheet);
  }

  // ─── Reopen Sheet (SUPER_ADMIN, FACTORY_ADMIN, MANAGER only) ────────────────
  static async reopenSheet(
    id: string,
    actor: IUser,
    explicitFactoryId?: string,
  ): Promise<SafeProductionSheet> {
    const factoryId = this.resolveFactoryId(actor, explicitFactoryId);

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid production sheet ID format');
    }

    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.FACTORY_ADMIN &&
      actor.role !== UserRole.MANAGER
    ) {
      throw new ApiError(403, 'Only administrators and managers are authorized to reopen a completed production sheet');
    }

    const sheet = await ProductionSheet.findOne({
      _id: new Types.ObjectId(id),
      factoryId,
    });

    if (!sheet) {
      throw new ApiError(404, 'Production sheet not found');
    }

    sheet.status = ProductionSheetStatus.DRAFT;
    sheet.completedAt = undefined;
    sheet.completedBy = undefined;
    sheet.updatedBy = actor._id;

    await sheet.save();
    return toSafeProductionSheet(sheet);
  }

  // ─── List Sheets ────────────────────────────────────────────────────────────
  static async listSheets(
    query: QueryProductionSheetInput,
    actor: IUser,
    explicitFactoryId?: string,
  ): Promise<ProductionSheetPaginationResult> {
    const factoryId = this.resolveFactoryId(actor, explicitFactoryId || query.factoryId);

    const filter: FilterQuery<IProductionSheet> = { factoryId };

    if (query.date) {
      filter.productionDate = normalizeProductionDate(query.date);
    } else if (query.startDate || query.endDate) {
      filter.productionDate = {};
      if (query.startDate) {
        filter.productionDate.$gte = normalizeProductionDate(query.startDate);
      }
      if (query.endDate) {
        filter.productionDate.$lte = normalizeProductionDate(query.endDate);
      }
    }

    if (query.shift) {
      filter.shift = query.shift;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = {
      [query.sortBy]: sortDirection,
      _id: -1,
    };

    const [sheets, totalItems] = await Promise.all([
      ProductionSheet.find(filter).sort(sortOptions).skip(skip).limit(limit),
      ProductionSheet.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      sheets: sheets.map((s) => toSafeProductionSheet(s)),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }
}
