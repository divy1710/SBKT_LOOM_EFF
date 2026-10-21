import { Types, FilterQuery } from 'mongoose';
import {
  Fabric,
  IFabric,
  SafeFabric,
  toSafeFabric,
  normalizeFabricName,
  normalizeFabricCode,
} from './fabric.model';
import { Yarn } from '../yarn/yarn.model';
import {
  CreateFabricInput,
  UpdateFabricInput,
  QueryFabricInput,
} from './fabric.validation';
import { IUser, UserRole } from '../user/user.model';
import { Factory } from '../factory/factory.model';
import { ApiError } from '../../utils/ApiError';

/** Escape regex special characters for safe MongoDB string search */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Resolve and validate that a yarn belongs to the target factory,
 * is of an acceptable type, and is active.
 */
async function validateYarnForFactory(
  yarnId: string,
  factoryId: Types.ObjectId,
  role: string,
): Promise<void> {
  if (!Types.ObjectId.isValid(yarnId)) {
    throw ApiError.badRequest(`Invalid yarn ID: ${yarnId}`);
  }
  const yarn = await Yarn.findById(yarnId).exec();
  if (!yarn) {
    throw ApiError.badRequest(`Yarn not found: ${yarnId}`);
  }
  if (yarn.factoryId.toString() !== factoryId.toString()) {
    throw ApiError.badRequest('Yarn does not belong to this factory');
  }
  if (!yarn.isActive && role !== UserRole.SUPER_ADMIN) {
    throw ApiError.badRequest('Selected yarn is inactive');
  }
}

export class FabricService {
  // ─── Create ────────────────────────────────────────────────────────────────
  static async createFabric(input: CreateFabricInput, actor: IUser): Promise<SafeFabric> {
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.FACTORY_ADMIN
    ) {
      throw new ApiError(403, 'Insufficient permissions to create fabric');
    }

    // Resolve target factory
    let targetFactoryId: Types.ObjectId;
    if (actor.role === UserRole.SUPER_ADMIN) {
      const explicitFactoryId = input.factoryId ?? actor.factoryId?.toString();
      if (!explicitFactoryId) {
        throw ApiError.badRequest('Factory ID is required for Super Admin');
      }
      const factory = await Factory.findById(explicitFactoryId);
      if (!factory || !factory.isActive) {
        throw ApiError.badRequest('Invalid or inactive factory');
      }
      targetFactoryId = factory._id;
    } else {
      if (!actor.factoryId) {
        throw ApiError.badRequest('User is not assigned to a factory');
      }
      targetFactoryId = actor.factoryId;
    }

    // Validate yarn references
    await validateYarnForFactory(input.warpYarnId, targetFactoryId, actor.role);
    await validateYarnForFactory(input.weftYarnId, targetFactoryId, actor.role);

    const normalizedName = normalizeFabricName(input.name);
    const normalizedCode = normalizeFabricCode(input.code);

    // Pre-check: duplicate code within factory
    const dupCode = await Fabric.findOne({ factoryId: targetFactoryId, normalizedCode });
    if (dupCode) {
      throw new ApiError(409, `Fabric code "${input.code}" already exists in this factory`);
    }

    // Pre-check: duplicate name within factory
    const dupName = await Fabric.findOne({ factoryId: targetFactoryId, normalizedName });
    if (dupName) {
      throw new ApiError(409, `Fabric name "${input.name}" already exists in this factory`);
    }

    try {
      const fabric = await Fabric.create({
        name: input.name.trim(),
        normalizedName,
        code: input.code.trim().toUpperCase(),
        normalizedCode,
        warpYarnId: new Types.ObjectId(input.warpYarnId),
        weftYarnId: new Types.ObjectId(input.weftYarnId),
        ppi: input.ppi,
        panno: input.panno,
        wastagePercent: input.wastagePercent,
        recommendedRpm: input.recommendedRpm,
        description: input.description?.trim(),
        factoryId: targetFactoryId,
        isActive: true,
        createdBy: actor._id,
        updatedBy: actor._id,
      });

      return toSafeFabric(fabric);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new ApiError(409, 'A fabric with the same name or code already exists in this factory');
      }
      throw err;
    }
  }

  // ─── List / Paginate ───────────────────────────────────────────────────────
  static async getFabrics(
    query: QueryFabricInput,
    actor: IUser,
  ): Promise<{
    items: SafeFabric[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const filter: FilterQuery<IFabric> = {};

    // Factory isolation
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

    // Active status filtering
    if (actor.role === UserRole.OPERATOR || actor.role === UserRole.VIEWER) {
      filter.isActive = true;
    } else {
      if (query.isActive === 'true' || query.isActive === true) {
        filter.isActive = true;
      } else if (query.isActive === 'false' || query.isActive === false) {
        filter.isActive = false;
      }
    }

    // Search by name or code
    if (query.search && query.search.trim().length > 0) {
      const escaped = escapeRegex(query.search.trim());
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { code: { $regex: escaped, $options: 'i' } },
      ];
    }

    // Pagination & Sorting
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const skip = (page - 1) * limit;

    const allowedSortFields = ['name', 'code', 'ppi', 'panno', 'createdAt', 'updatedAt'];
    const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'updatedAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

    const [totalItems, fabrics] = await Promise.all([
      Fabric.countDocuments(filter),
      Fabric.find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    return {
      items: fabrics.map(toSafeFabric),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  // ─── Get By ID ─────────────────────────────────────────────────────────────
  static async getFabricById(id: string, actor: IUser): Promise<SafeFabric> {
    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid fabric ID');
    }

    const fabric = await Fabric.findById(id).exec();
    if (!fabric) {
      throw ApiError.notFound('Fabric not found');
    }

    // Factory isolation
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      (!actor.factoryId || fabric.factoryId.toString() !== actor.factoryId.toString())
    ) {
      throw ApiError.notFound('Fabric not found');
    }

    // Operators/Viewers cannot see inactive fabrics
    if (
      (actor.role === UserRole.OPERATOR || actor.role === UserRole.VIEWER) &&
      !fabric.isActive
    ) {
      throw ApiError.notFound('Fabric not found');
    }

    return toSafeFabric(fabric);
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  static async updateFabric(
    id: string,
    input: UpdateFabricInput,
    actor: IUser,
  ): Promise<SafeFabric> {
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.FACTORY_ADMIN
    ) {
      throw new ApiError(403, 'Insufficient permissions to update fabric');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid fabric ID');
    }

    const fabric = await Fabric.findById(id).exec();
    if (!fabric) {
      throw ApiError.notFound('Fabric not found');
    }

    // Factory isolation
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      (!actor.factoryId || fabric.factoryId.toString() !== actor.factoryId.toString())
    ) {
      throw ApiError.notFound('Fabric not found');
    }

    // Validate updated yarn references (if changing)
    if (input.warpYarnId !== undefined) {
      await validateYarnForFactory(input.warpYarnId, fabric.factoryId, actor.role);
    }
    if (input.weftYarnId !== undefined) {
      await validateYarnForFactory(input.weftYarnId, fabric.factoryId, actor.role);
    }

    // Duplicate code check (if code is changing)
    if (input.code !== undefined) {
      const newNormalizedCode = normalizeFabricCode(input.code);
      const dupCode = await Fabric.findOne({
        _id: { $ne: fabric._id },
        factoryId: fabric.factoryId,
        normalizedCode: newNormalizedCode,
      });
      if (dupCode) {
        throw new ApiError(409, `Fabric code "${input.code}" already exists in this factory`);
      }
      fabric.code = input.code.trim().toUpperCase();
      fabric.normalizedCode = newNormalizedCode;
    }

    // Duplicate name check (if name is changing)
    if (input.name !== undefined) {
      const newNormalizedName = normalizeFabricName(input.name);
      const dupName = await Fabric.findOne({
        _id: { $ne: fabric._id },
        factoryId: fabric.factoryId,
        normalizedName: newNormalizedName,
      });
      if (dupName) {
        throw new ApiError(409, `Fabric name "${input.name}" already exists in this factory`);
      }
      fabric.name = input.name.trim();
      fabric.normalizedName = newNormalizedName;
    }

    // Apply remaining updates
    if (input.warpYarnId !== undefined) {
      fabric.warpYarnId = new Types.ObjectId(input.warpYarnId);
    }
    if (input.weftYarnId !== undefined) {
      fabric.weftYarnId = new Types.ObjectId(input.weftYarnId);
    }
    if (input.ppi !== undefined) fabric.ppi = input.ppi;
    if (input.panno !== undefined) fabric.panno = input.panno;
    if (input.wastagePercent !== undefined) fabric.wastagePercent = input.wastagePercent;
    if (input.recommendedRpm !== undefined) fabric.recommendedRpm = input.recommendedRpm;
    if (input.description !== undefined) fabric.description = input.description.trim();

    fabric.updatedBy = actor._id;

    try {
      await fabric.save();
      return toSafeFabric(fabric);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new ApiError(409, 'A fabric with the same name or code already exists in this factory');
      }
      throw err;
    }
  }

  // ─── Status Toggle ─────────────────────────────────────────────────────────
  static async updateFabricStatus(
    id: string,
    isActive: boolean,
    actor: IUser,
  ): Promise<SafeFabric> {
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.FACTORY_ADMIN
    ) {
      throw new ApiError(403, 'Insufficient permissions to change fabric status');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid fabric ID');
    }

    const fabric = await Fabric.findById(id).exec();
    if (!fabric) {
      throw ApiError.notFound('Fabric not found');
    }

    // Factory isolation
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      (!actor.factoryId || fabric.factoryId.toString() !== actor.factoryId.toString())
    ) {
      throw ApiError.notFound('Fabric not found');
    }

    fabric.isActive = isActive;
    fabric.updatedBy = actor._id;
    await fabric.save();
    return toSafeFabric(fabric);
  }
}
