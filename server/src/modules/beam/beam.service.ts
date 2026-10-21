import { Types, FilterQuery } from 'mongoose';
import {
  Beam,
  IBeam,
  BeamStatus,
  normalizeBeamNumber,
  toSafeBeam,
  SafeBeam,
} from './beam.model';
import {
  BeamLoadingHistory,
  toSafeBeamHistory,
  SafeBeamHistory,
} from './beam-history.model';
import { Fabric } from '../fabric/fabric.model';
import { Yarn } from '../yarn/yarn.model';
import { Machine, MachineStatus } from '../machine/machine.model';
import { IUser, UserRole } from '../user/user.model';
import { ApiError } from '../../utils/ApiError';
import {
  CreateBeamInput,
  UpdateBeamInput,
  UpdateBeamStatusInput,
  LoadBeamInput,
  UnloadBeamInput,
  QueryBeamInput,
} from './beam.validation';

export class BeamService {
  // ─── Create Beam ─────────────────────────────────────────────────────────────
  static async createBeam(input: CreateBeamInput, actor: IUser): Promise<SafeBeam> {
    const targetFactoryId =
      actor.role === UserRole.SUPER_ADMIN && input.factoryId
        ? new Types.ObjectId(input.factoryId)
        : actor.factoryId;

    if (!targetFactoryId) {
      throw new ApiError(400, 'User is not assigned to a factory');
    }

    // 1. Verify Fabric exists, belongs to same factory, and is active
    const fabric = await Fabric.findOne({
      _id: new Types.ObjectId(input.fabricId),
      factoryId: targetFactoryId,
    });
    if (!fabric) {
      throw new ApiError(404, 'Referenced Fabric does not exist or belongs to another factory');
    }
    if (!fabric.isActive) {
      throw new ApiError(400, 'Cannot create beam with an inactive fabric quality');
    }

    // 2. Verify Warp Yarn exists, belongs to same factory, and is active
    const warpYarn = await Yarn.findOne({
      _id: new Types.ObjectId(input.warpYarnId),
      factoryId: targetFactoryId,
    });
    if (!warpYarn) {
      throw new ApiError(404, 'Referenced Warp Yarn does not exist or belongs to another factory');
    }
    if (!warpYarn.isActive) {
      throw new ApiError(400, 'Cannot create beam with an inactive warp yarn');
    }

    // 3. Duplicate check for normalized beamNumber
    const normalizedBeamNumber = normalizeBeamNumber(input.beamNumber);
    const existing = await Beam.findOne({
      factoryId: targetFactoryId,
      normalizedBeamNumber,
    });
    if (existing) {
      throw new ApiError(
        409,
        `Beam number "${input.beamNumber}" already exists in this factory`,
      );
    }

    // 4. Default remaining length to original length if not explicitly provided
    const remainingLengthMeters =
      input.remainingLengthMeters !== undefined
        ? input.remainingLengthMeters
        : input.originalLengthMeters;

    if (remainingLengthMeters > input.originalLengthMeters) {
      throw new ApiError(400, 'Remaining length cannot exceed original length');
    }

    try {
      const beam = await Beam.create({
        beamNumber: input.beamNumber.trim().toUpperCase(),
        normalizedBeamNumber,
        pipeNumber: input.pipeNumber?.trim() || undefined,
        factoryId: targetFactoryId,
        fabricId: fabric._id,
        warpYarnId: warpYarn._id,
        originalLengthMeters: input.originalLengthMeters,
        remainingLengthMeters,
        ends: input.ends,
        widthInches: input.widthInches,
        status: BeamStatus.IN_GODOWN,
        alertAtMeters: input.alertAtMeters ?? 500,
        notes: input.notes?.trim() || undefined,
        isActive: true,
        createdBy: actor._id,
        updatedBy: actor._id,
      });

      // Populate fabric and warp yarn for rich response
      await beam.populate([
        { path: 'fabricId', select: 'name code ppi panno' },
        { path: 'warpYarnId', select: 'name denier yarnType' },
      ]);

      return toSafeBeam(beam);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new ApiError(409, `Beam number "${input.beamNumber}" already exists in this factory`);
      }
      throw err;
    }
  }

  // ─── List / Paginate Beams ───────────────────────────────────────────────────
  static async getBeams(
    query: QueryBeamInput,
    actor: IUser,
  ): Promise<{
    items: SafeBeam[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const filter: FilterQuery<IBeam> = {};

    // 1. Factory isolation
    if (actor.role === UserRole.SUPER_ADMIN) {
      if (query.factoryId) {
        filter.factoryId = new Types.ObjectId(query.factoryId);
      } else if (actor.factoryId) {
        filter.factoryId = actor.factoryId;
      }
    } else {
      if (!actor.factoryId) {
        return {
          items: [],
          pagination: { page: query.page, limit: query.limit, totalItems: 0, totalPages: 0 },
        };
      }
      filter.factoryId = actor.factoryId;
    }

    // 2. Active status filtering
    if (actor.role === UserRole.OPERATOR || actor.role === UserRole.VIEWER) {
      filter.isActive = true;
    } else {
      if (query.isActive === 'true' || query.isActive === true) {
        filter.isActive = true;
      } else if (query.isActive === 'false' || query.isActive === false) {
        filter.isActive = false;
      }
    }

    // 3. Status filter
    if (query.status && Object.values(BeamStatus).includes(query.status)) {
      filter.status = query.status;
    }

    // 4. Fabric filter
    if (query.fabricId) {
      filter.fabricId = new Types.ObjectId(query.fabricId);
    }

    // 5. Warp yarn filter
    if (query.warpYarnId) {
      filter.warpYarnId = new Types.ObjectId(query.warpYarnId);
    }

    // 6. Low meters filter (remainingLengthMeters <= alertAtMeters)
    if (query.lowMeters === 'true' || query.lowMeters === true) {
      filter.$expr = { $lte: ['$remainingLengthMeters', '$alertAtMeters'] };
    }

    // 7. Search (by beamNumber or pipeNumber)
    if (query.search && query.search.trim().length > 0) {
      const trimmed = query.search.trim();
      const escaped = trimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ beamNumber: regex }, { pipeNumber: regex }];
    }

    // 8. Pagination & Sorting
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const skip = (page - 1) * limit;

    const allowedSortFields = [
      'beamNumber',
      'originalLengthMeters',
      'remainingLengthMeters',
      'ends',
      'status',
      'createdAt',
      'updatedAt',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'updatedAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

    const [totalItems, beams] = await Promise.all([
      Beam.countDocuments(filter),
      Beam.find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate([
          { path: 'fabricId', select: 'name code ppi panno' },
          { path: 'warpYarnId', select: 'name denier yarnType' },
        ])
        .exec(),
    ]);

    return {
      items: beams.map(toSafeBeam),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  // ─── Get Single Beam by ID ──────────────────────────────────────────────────
  static async getBeamById(id: string, actor: IUser): Promise<SafeBeam> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Beam ID format');
    }

    const filter: FilterQuery<IBeam> = { _id: new Types.ObjectId(id) };

    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const beam = await Beam.findOne(filter).populate([
      { path: 'fabricId', select: 'name code ppi panno' },
      { path: 'warpYarnId', select: 'name denier yarnType' },
    ]);

    if (!beam) {
      throw new ApiError(404, 'Beam not found');
    }

    if (
      !beam.isActive &&
      (actor.role === UserRole.OPERATOR || actor.role === UserRole.VIEWER)
    ) {
      throw new ApiError(404, 'Beam not found');
    }

    return toSafeBeam(beam);
  }

  // ─── Update Beam ─────────────────────────────────────────────────────────────
  static async updateBeam(
    id: string,
    input: UpdateBeamInput,
    actor: IUser,
  ): Promise<SafeBeam> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Beam ID format');
    }

    const filter: FilterQuery<IBeam> = { _id: new Types.ObjectId(id) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const beam = await Beam.findOne(filter);
    if (!beam) {
      throw new ApiError(404, 'Beam not found');
    }

    // Check duplicate beamNumber if modified
    if (input.beamNumber && input.beamNumber.trim() !== beam.beamNumber) {
      const normalizedBeamNumber = normalizeBeamNumber(input.beamNumber);
      const dup = await Beam.findOne({
        factoryId: beam.factoryId,
        normalizedBeamNumber,
        _id: { $ne: beam._id },
      });
      if (dup) {
        throw new ApiError(
          409,
          `Beam number "${input.beamNumber}" already exists in this factory`,
        );
      }
      beam.beamNumber = input.beamNumber.trim().toUpperCase();
      beam.normalizedBeamNumber = normalizedBeamNumber;
    }

    // If fabricId modified, verify it exists and belongs to same factory
    if (input.fabricId && input.fabricId !== beam.fabricId.toString()) {
      const fabric = await Fabric.findOne({
        _id: new Types.ObjectId(input.fabricId),
        factoryId: beam.factoryId,
      });
      if (!fabric) {
        throw new ApiError(404, 'Referenced Fabric does not exist or belongs to another factory');
      }
      beam.fabricId = fabric._id;
    }

    // If warpYarnId modified, verify it exists and belongs to same factory
    if (input.warpYarnId && input.warpYarnId !== beam.warpYarnId.toString()) {
      const yarn = await Yarn.findOne({
        _id: new Types.ObjectId(input.warpYarnId),
        factoryId: beam.factoryId,
      });
      if (!yarn) {
        throw new ApiError(404, 'Referenced Warp Yarn does not exist or belongs to another factory');
      }
      beam.warpYarnId = yarn._id;
    }

    // Meter validation
    const newOriginalLength =
      input.originalLengthMeters !== undefined
        ? input.originalLengthMeters
        : beam.originalLengthMeters;
    const newRemainingLength =
      input.remainingLengthMeters !== undefined
        ? input.remainingLengthMeters
        : beam.remainingLengthMeters;

    if (newRemainingLength > newOriginalLength) {
      throw new ApiError(400, 'Remaining length cannot exceed original length');
    }

    if (input.originalLengthMeters !== undefined) {
      beam.originalLengthMeters = input.originalLengthMeters;
    }
    if (input.remainingLengthMeters !== undefined) {
      beam.remainingLengthMeters = input.remainingLengthMeters;
    }
    if (input.pipeNumber !== undefined) beam.pipeNumber = input.pipeNumber.trim() || undefined;
    if (input.ends !== undefined) beam.ends = input.ends;
    if (input.widthInches !== undefined) beam.widthInches = input.widthInches;
    if (input.alertAtMeters !== undefined) beam.alertAtMeters = input.alertAtMeters;
    if (input.notes !== undefined) beam.notes = input.notes.trim() || undefined;

    beam.updatedBy = actor._id;

    await beam.save();
    await beam.populate([
      { path: 'fabricId', select: 'name code ppi panno' },
      { path: 'warpYarnId', select: 'name denier yarnType' },
    ]);

    return toSafeBeam(beam);
  }

  // ─── Lifecycle / Status Transitions ──────────────────────────────────────────
  static async updateBeamStatus(
    id: string,
    input: UpdateBeamStatusInput,
    actor: IUser,
  ): Promise<SafeBeam> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Beam ID format');
    }

    const filter: FilterQuery<IBeam> = { _id: new Types.ObjectId(id) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const beam = await Beam.findOne(filter);
    if (!beam) {
      throw new ApiError(404, 'Beam not found');
    }

    const currentStatus = beam.status;
    const targetStatus = input.status;

    if (currentStatus === targetStatus) {
      return toSafeBeam(beam);
    }

    // State machine validation
    // Valid transitions:
    // IN_GODOWN -> LOADED, FINISHED, SHORTAGE
    // LOADED -> IN_GODOWN, FINISHED, SHORTAGE
    // FINISHED / SHORTAGE -> IN_GODOWN (reopen to storage)
    if (currentStatus === BeamStatus.FINISHED && targetStatus === BeamStatus.LOADED) {
      throw new ApiError(
        409,
        'Cannot directly load a FINISHED beam. Transition to IN_GODOWN first to verify inventory.',
      );
    }
    if (currentStatus === BeamStatus.SHORTAGE && targetStatus === BeamStatus.LOADED) {
      throw new ApiError(
        409,
        'Cannot directly load a SHORTAGE beam. Return to IN_GODOWN first to verify usable meters.',
      );
    }

    beam.status = targetStatus;
    beam.updatedBy = actor._id;

    if (targetStatus === BeamStatus.FINISHED) {
      // Mark as finished; remaining length can be kept or noted
      beam.unloadedAt = new Date();
    } else if (targetStatus === BeamStatus.IN_GODOWN) {
      beam.loadedMachineId = undefined;
      beam.loadedMachineNumber = undefined;
    }

    if (input.notes) {
      beam.notes = beam.notes ? `${beam.notes} | ${input.notes}` : input.notes;
    }

    await beam.save();
    await beam.populate([
      { path: 'fabricId', select: 'name code ppi panno' },
      { path: 'warpYarnId', select: 'name denier yarnType' },
    ]);

    return toSafeBeam(beam);
  }

  // ─── Load Beam onto Machine ──────────────────────────────────────────────────
  static async loadBeam(id: string, input: LoadBeamInput, actor: IUser): Promise<SafeBeam> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Beam ID format');
    }

    const filter: FilterQuery<IBeam> = { _id: new Types.ObjectId(id) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const beam = await Beam.findOne(filter);
    if (!beam) {
      throw new ApiError(404, 'Beam not found');
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
      throw new ApiError(409, `Cannot load a FINISHED beam. Beam has completed its production.`);
    }

    if (beam.remainingLengthMeters <= 0) {
      throw new ApiError(400, 'Cannot load beam with 0 remaining meters.');
    }

    // Check if target machine already has another loaded beam in this factory
    let targetMachineId: Types.ObjectId | undefined = undefined;
    if (input.machineNumber) {
      const machineNumberNormalized = input.machineNumber.trim().toUpperCase();
      const existingOnMachine = await Beam.findOne({
        factoryId: beam.factoryId,
        status: BeamStatus.LOADED,
        loadedMachineNumber: machineNumberNormalized,
        _id: { $ne: beam._id },
      });
      if (existingOnMachine) {
        throw new ApiError(
          409,
          `Machine ${machineNumberNormalized} already has beam "${existingOnMachine.beamNumber}" loaded`,
        );
      }
      beam.loadedMachineNumber = machineNumberNormalized;

      // Also check if Machine document exists in DB
      const targetMachine = await Machine.findOne({
        factoryId: beam.factoryId,
        normalizedMachineNumber: machineNumberNormalized,
      });
      if (targetMachine) {
        if (!targetMachine.isActive) {
          throw new ApiError(400, `Cannot load beam onto inactive machine "${targetMachine.machineNumber}"`);
        }
        if (targetMachine.status === MachineStatus.MAINTENANCE) {
          throw new ApiError(
            400,
            `Cannot load beam onto machine "${targetMachine.machineNumber}" while in MAINTENANCE status`,
          );
        }
        if (targetMachine.loadedBeamId && targetMachine.loadedBeamId.toString() !== beam._id.toString()) {
          throw new ApiError(409, `Machine "${targetMachine.machineNumber}" already has another beam loaded`);
        }
        targetMachine.loadedBeamId = beam._id;
        targetMachine.updatedBy = actor._id;
        await targetMachine.save();
        targetMachineId = targetMachine._id;
        beam.loadedMachineId = targetMachine._id;
      }
    }

    const now = new Date();
    beam.status = BeamStatus.LOADED;
    beam.loadedAt = now;
    beam.unloadedAt = undefined;
    beam.updatedBy = actor._id;

    await beam.save();

    // Record loading event in BeamLoadingHistory
    await BeamLoadingHistory.create({
      factoryId: beam.factoryId,
      beamId: beam._id,
      machineId: targetMachineId || beam.loadedMachineId,
      machineNumber: beam.loadedMachineNumber,
      loadedAt: now,
      startingMeters: beam.remainingLengthMeters,
      status: BeamStatus.LOADED,
      notes: input.notes?.trim() || undefined,
      createdBy: actor._id,
      updatedBy: actor._id,
    });

    await beam.populate([
      { path: 'fabricId', select: 'name code ppi panno' },
      { path: 'warpYarnId', select: 'name denier yarnType' },
    ]);

    return toSafeBeam(beam);
  }

  // ─── Unload Beam from Machine ────────────────────────────────────────────────
  static async unloadBeam(
    id: string,
    input: UnloadBeamInput,
    actor: IUser,
  ): Promise<SafeBeam> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Beam ID format');
    }

    const filter: FilterQuery<IBeam> = { _id: new Types.ObjectId(id) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const beam = await Beam.findOne(filter);
    if (!beam) {
      throw new ApiError(404, 'Beam not found');
    }

    if (beam.status !== BeamStatus.LOADED) {
      throw new ApiError(409, `Beam "${beam.beamNumber}" is not currently in LOADED status`);
    }

    const now = new Date();
    const endingMeters =
      input.endingMeters !== undefined
        ? input.endingMeters
        : beam.remainingLengthMeters;

    if (endingMeters > beam.remainingLengthMeters) {
      throw new ApiError(
        400,
        `Ending meters (${endingMeters}) cannot exceed current remaining meters (${beam.remainingLengthMeters})`,
      );
    }

    const startingMeters = beam.remainingLengthMeters;
    const usedMeters = Math.max(0, startingMeters - endingMeters);

    beam.remainingLengthMeters = endingMeters;
    beam.status = input.outcomeStatus || BeamStatus.IN_GODOWN;
    beam.unloadedAt = now;
    const previousMachine = beam.loadedMachineNumber;
    const previousMachineId = beam.loadedMachineId;
    beam.loadedMachineId = undefined;
    beam.loadedMachineNumber = undefined;
    beam.updatedBy = actor._id;

    await beam.save();

    // If machine document exists, clear loadedBeamId
    if (previousMachineId) {
      await Machine.findByIdAndUpdate(previousMachineId, {
        $unset: { loadedBeamId: 1 },
        updatedBy: actor._id,
      });
    } else if (previousMachine) {
      await Machine.findOneAndUpdate(
        {
          factoryId: beam.factoryId,
          normalizedMachineNumber: previousMachine.trim().toUpperCase(),
        },
        {
          $unset: { loadedBeamId: 1 },
          updatedBy: actor._id,
        },
      );
    }

    // Record unloading event in BeamLoadingHistory
    await BeamLoadingHistory.create({
      factoryId: beam.factoryId,
      beamId: beam._id,
      machineId: previousMachineId,
      machineNumber: previousMachine,
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

    await beam.populate([
      { path: 'fabricId', select: 'name code ppi panno' },
      { path: 'warpYarnId', select: 'name denier yarnType' },
    ]);

    return toSafeBeam(beam);
  }

  // ─── Get Beam History ────────────────────────────────────────────────────────
  static async getBeamHistory(beamId: string, actor: IUser): Promise<SafeBeamHistory[]> {
    if (!Types.ObjectId.isValid(beamId)) {
      throw new ApiError(400, 'Invalid Beam ID format');
    }

    // Verify beam belongs to actor's factory
    const beamFilter: FilterQuery<IBeam> = { _id: new Types.ObjectId(beamId) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      beamFilter.factoryId = actor.factoryId;
    }

    const beam = await Beam.findOne(beamFilter);
    if (!beam) {
      throw new ApiError(404, 'Beam not found');
    }

    const history = await BeamLoadingHistory.find({
      beamId: beam._id,
      factoryId: beam.factoryId,
    })
      .sort({ createdAt: -1 })
      .exec();

    return history.map(toSafeBeamHistory);
  }

  // ─── Soft Toggle Status ──────────────────────────────────────────────────────
  static async toggleBeamActive(
    id: string,
    isActive: boolean,
    actor: IUser,
  ): Promise<SafeBeam> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Beam ID format');
    }

    const filter: FilterQuery<IBeam> = { _id: new Types.ObjectId(id) };
    if (actor.role !== UserRole.SUPER_ADMIN) {
      if (!actor.factoryId) {
        throw new ApiError(403, 'User is not assigned to a factory');
      }
      filter.factoryId = actor.factoryId;
    }

    const beam = await Beam.findOne(filter);
    if (!beam) {
      throw new ApiError(404, 'Beam not found');
    }

    beam.isActive = isActive;
    beam.updatedBy = actor._id;
    await beam.save();

    await beam.populate([
      { path: 'fabricId', select: 'name code ppi panno' },
      { path: 'warpYarnId', select: 'name denier yarnType' },
    ]);

    return toSafeBeam(beam);
  }
}
