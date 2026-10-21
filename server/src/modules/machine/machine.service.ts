import { FilterQuery, Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { IUser, UserRole } from '../user/user.model';
import { Fabric } from '../fabric/fabric.model';
import { Beam, BeamStatus } from '../beam/beam.model';
import { BeamLoadingHistory } from '../beam/beam-history.model';
import {
  Machine,
  IMachine,
  SafeMachine,
  toSafeMachine,
  normalizeMachineNumber,
  MachineStatus,
} from './machine.model';
import {
  CreateMachineInput,
  UpdateMachineInput,
  UpdateMachineStatusInput,
  BatchUpdateMachineInput,
  MachineQueryParams,
  MachineLoadBeamInput,
  MachineUnloadBeamInput,
} from './machine.validation';

export interface MachinePaginationResult {
  machines: SafeMachine[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface BatchUpdateResult {
  updatedCount: number;
  failedCount: number;
  successfulIds: string[];
  errors?: Array<{ machineId: string; error: string }>;
}

export class MachineService {
  // ─── Resolve Effective Factory ID ──────────────────────────────────────────
  private static resolveFactoryId(actor: IUser, explicitFactoryId?: string): Types.ObjectId {
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
      throw new ApiError(400, 'Super admin must specify factoryId context for machine operations');
    }

    if (!actor.factoryId) {
      throw new ApiError(403, 'User is not assigned to a factory');
    }
    return actor.factoryId;
  }

  // ─── Create Machine ────────────────────────────────────────────────────────
  static async createMachine(
    input: CreateMachineInput,
    actor: IUser,
    explicitFactoryId?: string,
  ): Promise<SafeMachine> {
    const factoryId = this.resolveFactoryId(actor, explicitFactoryId);
    const normalizedNumber = normalizeMachineNumber(input.machineNumber);

    // 1. Check duplicate machineNumber within the factory
    const existing = await Machine.findOne({
      factoryId,
      normalizedMachineNumber: normalizedNumber,
    });
    if (existing) {
      throw new ApiError(
        409,
        `Machine number "${input.machineNumber}" already exists in this factory`,
      );
    }

    // 2. Validate fabric reference exists in same factory and is active
    const fabric = await Fabric.findOne({
      _id: new Types.ObjectId(input.fabricId),
      factoryId,
    });
    if (!fabric) {
      throw new ApiError(404, 'Referenced Fabric does not exist or belongs to another factory');
    }
    if (!fabric.isActive) {
      throw new ApiError(400, 'Cannot assign an inactive fabric to a new machine');
    }

    // 3. Create machine (loadedBeamId cannot be assigned on direct creation)
    const machine = await Machine.create({
      machineNumber: input.machineNumber.trim().toUpperCase(),
      normalizedMachineNumber: normalizedNumber,
      name: input.name.trim(),
      factoryId,
      fabricId: fabric._id,
      loadedBeamId: undefined,
      rpm: input.rpm,
      ppi: input.ppi,
      status: input.status || MachineStatus.STOPPED,
      notes: input.notes?.trim() || undefined,
      isActive: true,
      createdBy: actor._id,
      updatedBy: actor._id,
    });

    await machine.populate([
      { path: 'fabricId', select: 'name code ppi panno recommendedRpm' },
      { path: 'loadedBeamId', select: 'beamNumber originalLengthMeters remainingLengthMeters status' },
    ]);

    return toSafeMachine(machine);
  }

  // ─── List Machines with Pagination & Filters ───────────────────────────────
  static async getMachines(
    query: MachineQueryParams,
    actor: IUser,
  ): Promise<MachinePaginationResult> {
    const filter: FilterQuery<IMachine> = {};

    // Factory multi-tenancy enforcement
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    // Operators and Viewers only see active machines by default
    if (actor.role === UserRole.OPERATOR || actor.role === UserRole.VIEWER) {
      filter.isActive = true;
    } else if (query.isActive !== undefined && query.isActive !== 'all') {
      filter.isActive = query.isActive === true || query.isActive === 'true';
    }

    // Filter by status
    if (query.status) {
      filter.status = query.status;
    }

    // Filter by fabric
    if (query.fabricId) {
      filter.fabricId = new Types.ObjectId(query.fabricId);
    }

    // Search query on machineNumber or name
    if (query.search && query.search.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { machineNumber: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
      ];
    }

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const sortDirection = query.sortOrder === 'desc' ? -1 : 1;
    const sortField = query.sortBy;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [machines, totalItems] = await Promise.all([
      Machine.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate([
          { path: 'fabricId', select: 'name code ppi panno recommendedRpm' },
          { path: 'loadedBeamId', select: 'beamNumber originalLengthMeters remainingLengthMeters status' },
        ]),
      Machine.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      machines: machines.map(toSafeMachine),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  // ─── Get Single Machine By ID ──────────────────────────────────────────────
  static async getMachineById(id: string, actor: IUser): Promise<SafeMachine> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Machine ID format');
    }

    const filter: FilterQuery<IMachine> = { _id: new Types.ObjectId(id) };

    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const machine = await Machine.findOne(filter).populate([
      { path: 'fabricId', select: 'name code ppi panno recommendedRpm' },
      { path: 'loadedBeamId', select: 'beamNumber originalLengthMeters remainingLengthMeters status' },
    ]);

    if (!machine) {
      throw new ApiError(404, 'Machine not found');
    }

    if (
      !machine.isActive &&
      (actor.role === UserRole.OPERATOR || actor.role === UserRole.VIEWER)
    ) {
      throw new ApiError(404, 'Machine not found');
    }

    return toSafeMachine(machine);
  }

  // ─── Update Machine ────────────────────────────────────────────────────────
  static async updateMachine(
    id: string,
    input: UpdateMachineInput,
    actor: IUser,
  ): Promise<SafeMachine> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Machine ID format');
    }

    const filter: FilterQuery<IMachine> = { _id: new Types.ObjectId(id) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const machine = await Machine.findOne(filter);
    if (!machine) {
      throw new ApiError(404, 'Machine not found');
    }

    // Check duplicate machineNumber if changed
    if (input.machineNumber && input.machineNumber.trim() !== machine.machineNumber) {
      const normalizedNumber = normalizeMachineNumber(input.machineNumber);
      const dup = await Machine.findOne({
        factoryId: machine.factoryId,
        normalizedMachineNumber: normalizedNumber,
        _id: { $ne: machine._id },
      });
      if (dup) {
        throw new ApiError(
          409,
          `Machine number "${input.machineNumber}" already exists in this factory`,
        );
      }
      machine.machineNumber = input.machineNumber.trim().toUpperCase();
      machine.normalizedMachineNumber = normalizedNumber;
    }

    // Check fabricId if changed
    if (input.fabricId && input.fabricId !== machine.fabricId.toString()) {
      const fabric = await Fabric.findOne({
        _id: new Types.ObjectId(input.fabricId),
        factoryId: machine.factoryId,
      });
      if (!fabric) {
        throw new ApiError(404, 'Referenced Fabric does not exist or belongs to another factory');
      }
      if (!fabric.isActive) {
        throw new ApiError(400, 'Cannot assign an inactive fabric to machine');
      }
      machine.fabricId = fabric._id;
    }

    if (input.name !== undefined) machine.name = input.name.trim();
    if (input.rpm !== undefined) machine.rpm = input.rpm;
    if (input.ppi !== undefined) machine.ppi = input.ppi;
    if (input.notes !== undefined) machine.notes = input.notes.trim() || undefined;

    machine.updatedBy = actor._id;
    await machine.save();

    await machine.populate([
      { path: 'fabricId', select: 'name code ppi panno recommendedRpm' },
      { path: 'loadedBeamId', select: 'beamNumber originalLengthMeters remainingLengthMeters status' },
    ]);

    return toSafeMachine(machine);
  }

  // ─── Update Machine Status ─────────────────────────────────────────────────
  static async updateMachineStatus(
    id: string,
    input: UpdateMachineStatusInput,
    actor: IUser,
  ): Promise<SafeMachine> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Machine ID format');
    }

    const filter: FilterQuery<IMachine> = { _id: new Types.ObjectId(id) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const machine = await Machine.findOne(filter);
    if (!machine) {
      throw new ApiError(404, 'Machine not found');
    }

    machine.status = input.status;
    if (input.notes) {
      machine.notes = machine.notes ? `${machine.notes} | ${input.notes}` : input.notes;
    }
    machine.updatedBy = actor._id;

    await machine.save();

    await machine.populate([
      { path: 'fabricId', select: 'name code ppi panno recommendedRpm' },
      { path: 'loadedBeamId', select: 'beamNumber originalLengthMeters remainingLengthMeters status' },
    ]);

    return toSafeMachine(machine);
  }

  // ─── Toggle Machine Active / Deactive ──────────────────────────────────────
  static async toggleMachineActive(id: string, actor: IUser): Promise<SafeMachine> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Machine ID format');
    }

    const filter: FilterQuery<IMachine> = { _id: new Types.ObjectId(id) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const machine = await Machine.findOne(filter);
    if (!machine) {
      throw new ApiError(404, 'Machine not found');
    }

    // If deactivating, prevent if beam is currently loaded
    if (machine.isActive && machine.loadedBeamId) {
      throw new ApiError(
        400,
        `Cannot deactivate machine "${machine.machineNumber}" while a beam is loaded. Please unload the beam first.`,
      );
    }

    machine.isActive = !machine.isActive;
    machine.updatedBy = actor._id;
    await machine.save();

    await machine.populate([
      { path: 'fabricId', select: 'name code ppi panno recommendedRpm' },
      { path: 'loadedBeamId', select: 'beamNumber originalLengthMeters remainingLengthMeters status' },
    ]);

    return toSafeMachine(machine);
  }

  // ─── Batch Update Machines ─────────────────────────────────────────────────
  static async batchUpdateMachines(
    input: BatchUpdateMachineInput,
    actor: IUser,
  ): Promise<BatchUpdateResult> {
    const factoryId = this.resolveFactoryId(actor);
    const { machineIds, updates } = input;

    // 1. If fabricId is in updates, validate once up front
    let validFabricId: Types.ObjectId | undefined = undefined;
    if (updates.fabricId) {
      const fabric = await Fabric.findOne({
        _id: new Types.ObjectId(updates.fabricId),
        factoryId,
      });
      if (!fabric) {
        throw new ApiError(404, 'Referenced Fabric does not exist or belongs to another factory');
      }
      if (!fabric.isActive) {
        throw new ApiError(400, 'Cannot batch assign an inactive fabric');
      }
      validFabricId = fabric._id;
    }

    const successfulIds: string[] = [];
    const errors: Array<{ machineId: string; error: string }> = [];

    // 2. Process each machine
    for (const idStr of machineIds) {
      try {
        if (!Types.ObjectId.isValid(idStr)) {
          errors.push({ machineId: idStr, error: 'Invalid Machine ID format' });
          continue;
        }

        const machine = await Machine.findOne({
          _id: new Types.ObjectId(idStr),
          factoryId,
        });

        if (!machine) {
          errors.push({ machineId: idStr, error: 'Machine not found in authorized factory' });
          continue;
        }

        if (!machine.isActive) {
          errors.push({ machineId: idStr, error: 'Cannot batch update an inactive machine' });
          continue;
        }

        // Apply only provided fields
        if (validFabricId) machine.fabricId = validFabricId;
        if (updates.rpm !== undefined) machine.rpm = updates.rpm;
        if (updates.ppi !== undefined) machine.ppi = updates.ppi;
        if (updates.notes !== undefined) {
          machine.notes = updates.notes.trim() || undefined;
        }

        machine.updatedBy = actor._id;
        await machine.save();
        successfulIds.push(machine._id.toString());
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error during batch update';
        errors.push({ machineId: idStr, error: message });
      }
    }

    return {
      updatedCount: successfulIds.length,
      failedCount: errors.length,
      successfulIds,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ─── Load Beam onto Machine ────────────────────────────────────────────────
  static async loadBeam(
    machineId: string,
    input: MachineLoadBeamInput,
    actor: IUser,
  ): Promise<SafeMachine> {
    if (!Types.ObjectId.isValid(machineId)) {
      throw new ApiError(400, 'Invalid Machine ID format');
    }

    const factoryId = this.resolveFactoryId(actor);

    // 1. Find and validate Machine
    const machine = await Machine.findOne({
      _id: new Types.ObjectId(machineId),
      factoryId,
    });
    if (!machine) {
      throw new ApiError(404, 'Machine not found');
    }

    if (!machine.isActive) {
      throw new ApiError(400, 'Cannot load beam onto an inactive machine');
    }

    if (machine.status === MachineStatus.MAINTENANCE) {
      throw new ApiError(
        400,
        `Cannot load beam onto machine "${machine.machineNumber}" while in MAINTENANCE status`,
      );
    }

    if (machine.loadedBeamId) {
      throw new ApiError(
        409,
        `Machine "${machine.machineNumber}" already has a beam loaded. Unload current beam first.`,
      );
    }

    // 2. Find and validate Beam
    const beam = await Beam.findOne({
      _id: new Types.ObjectId(input.beamId),
      factoryId,
    });
    if (!beam) {
      throw new ApiError(404, 'Beam not found in this factory');
    }

    if (!beam.isActive) {
      throw new ApiError(400, 'Cannot load an inactive beam');
    }

    if (beam.status === BeamStatus.LOADED) {
      throw new ApiError(
        409,
        `Beam "${beam.beamNumber}" is already loaded${
          beam.loadedMachineNumber ? ` on machine ${beam.loadedMachineNumber}` : ''
        }`,
      );
    }

    if (beam.status === BeamStatus.FINISHED) {
      throw new ApiError(409, `Cannot load a FINISHED beam.`);
    }

    if (beam.remainingLengthMeters <= 0) {
      throw new ApiError(400, 'Cannot load beam with 0 remaining meters.');
    }

    const now = new Date();

    // 3. Update Machine
    machine.loadedBeamId = beam._id;
    machine.updatedBy = actor._id;
    await machine.save();

    // 4. Update Beam
    beam.status = BeamStatus.LOADED;
    beam.loadedMachineId = machine._id;
    beam.loadedMachineNumber = machine.machineNumber;
    beam.loadedAt = now;
    beam.unloadedAt = undefined;
    beam.updatedBy = actor._id;
    await beam.save();

    // 5. Record loading history
    await BeamLoadingHistory.create({
      factoryId,
      beamId: beam._id,
      machineId: machine._id,
      machineNumber: machine.machineNumber,
      loadedAt: now,
      startingMeters: beam.remainingLengthMeters,
      status: BeamStatus.LOADED,
      notes: input.notes?.trim() || undefined,
      createdBy: actor._id,
      updatedBy: actor._id,
    });

    await machine.populate([
      { path: 'fabricId', select: 'name code ppi panno recommendedRpm' },
      { path: 'loadedBeamId', select: 'beamNumber originalLengthMeters remainingLengthMeters status' },
    ]);

    return toSafeMachine(machine);
  }

  // ─── Unload Beam from Machine ──────────────────────────────────────────────
  static async unloadBeam(
    machineId: string,
    input: MachineUnloadBeamInput,
    actor: IUser,
  ): Promise<SafeMachine> {
    if (!Types.ObjectId.isValid(machineId)) {
      throw new ApiError(400, 'Invalid Machine ID format');
    }

    const factoryId = this.resolveFactoryId(actor);

    // 1. Find Machine
    const machine = await Machine.findOne({
      _id: new Types.ObjectId(machineId),
      factoryId,
    });
    if (!machine) {
      throw new ApiError(404, 'Machine not found');
    }

    if (!machine.loadedBeamId) {
      throw new ApiError(400, `Machine "${machine.machineNumber}" does not have any beam loaded`);
    }

    // 2. Find Beam
    const beam = await Beam.findOne({
      _id: machine.loadedBeamId,
      factoryId,
    });
    if (!beam) {
      // Clean up orphaned reference if beam was somehow deleted
      machine.loadedBeamId = undefined;
      machine.updatedBy = actor._id;
      await machine.save();
      throw new ApiError(404, 'Loaded beam record not found');
    }

    const now = new Date();
    const endingMeters =
      input.endingMeters !== undefined ? input.endingMeters : beam.remainingLengthMeters;

    if (endingMeters > beam.remainingLengthMeters) {
      throw new ApiError(
        400,
        `Ending meters (${endingMeters}) cannot exceed remaining meters (${beam.remainingLengthMeters})`,
      );
    }

    const startingMeters = beam.remainingLengthMeters;
    const usedMeters = Math.max(0, startingMeters - endingMeters);

    // 3. Update Beam
    beam.remainingLengthMeters = endingMeters;
    beam.status = input.outcomeStatus || BeamStatus.IN_GODOWN;
    beam.unloadedAt = now;
    beam.loadedMachineId = undefined;
    beam.loadedMachineNumber = undefined;
    beam.updatedBy = actor._id;
    await beam.save();

    // 4. Update Machine
    machine.loadedBeamId = undefined;
    machine.updatedBy = actor._id;
    await machine.save();

    // 5. Record unloading history
    await BeamLoadingHistory.create({
      factoryId,
      beamId: beam._id,
      machineId: machine._id,
      machineNumber: machine.machineNumber,
      loadedAt: beam.loadedAt || now,
      unloadedAt: now,
      startingMeters,
      endingMeters,
      usedMeters,
      status: beam.status,
      notes: input.notes?.trim() || undefined,
      createdBy: actor._id,
      updatedBy: actor._id,
    });

    await machine.populate([
      { path: 'fabricId', select: 'name code ppi panno recommendedRpm' },
      { path: 'loadedBeamId', select: 'beamNumber originalLengthMeters remainingLengthMeters status' },
    ]);

    return toSafeMachine(machine);
  }
}
