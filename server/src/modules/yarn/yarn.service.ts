import { Types, FilterQuery } from 'mongoose';
import {
  Yarn,
  IYarn,
  SafeYarn,
  toSafeYarn,
  normalizeYarnName,
  YarnType,
} from './yarn.model';
import {
  CreateYarnInput,
  UpdateYarnInput,
  QueryYarnInput,
} from './yarn.validation';
import { IUser, UserRole } from '../user/user.model';
import { Factory } from '../factory/factory.model';
import { ApiError } from '../../utils/ApiError';

/** Helper to escape regex special characters for safe MongoDB string search */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export class YarnService {
  /**
   * Create a new yarn record.
   * Permitted roles: SUPER_ADMIN, FACTORY_ADMIN.
   */
  static async createYarn(input: CreateYarnInput, actor: IUser): Promise<SafeYarn> {
    // 1. Role permission check
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.FACTORY_ADMIN
    ) {
      throw new ApiError(403, 'Insufficient permissions to create yarn');
    }

    // 2. Resolve target factoryId
    let targetFactoryId: Types.ObjectId;
    if (actor.role === UserRole.SUPER_ADMIN) {
      const explicitFactoryId = input.factoryId || actor.factoryId?.toString();
      if (!explicitFactoryId) {
        throw ApiError.badRequest('Factory ID is required for Super Admin');
      }
      const factoryExists = await Factory.findById(explicitFactoryId);
      if (!factoryExists || !factoryExists.isActive) {
        throw ApiError.badRequest('Invalid or inactive factory');
      }
      targetFactoryId = factoryExists._id;
    } else {
      // FACTORY_ADMIN: strictly use actor's factoryId (ignore input.factoryId)
      if (!actor.factoryId) {
        throw ApiError.badRequest('User is not assigned to a factory');
      }
      targetFactoryId = actor.factoryId;
    }

    const normalized = normalizeYarnName(input.name);

    // 3. Pre-check for duplicate yarn specification
    const existing = await Yarn.findOne({
      factoryId: targetFactoryId,
      normalizedName: normalized,
      denier: input.denier,
      yarnType: input.yarnType,
    });

    if (existing) {
      throw new ApiError(
        409,
        'A yarn with the same name, denier, and type already exists in this factory',
      );
    }

    try {
      const yarn = await Yarn.create({
        name: input.name.trim(),
        normalizedName: normalized,
        denier: input.denier,
        yarnType: input.yarnType,
        rate: input.rate,
        rateUnit: input.rateUnit,
        description: input.description?.trim(),
        factoryId: targetFactoryId,
        isActive: true,
        createdBy: actor._id,
        updatedBy: actor._id,
      });

      return toSafeYarn(yarn);
    } catch (err: unknown) {
      // Catch MongoDB unique index race condition (E11000)
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new ApiError(
          409,
          'A yarn with the same name, denier, and type already exists in this factory',
        );
      }
      throw err;
    }
  }

  /**
   * List yarn records with search, filter, pagination, and factory isolation.
   */
  static async getYarns(
    query: QueryYarnInput,
    actor: IUser,
  ): Promise<{
    items: SafeYarn[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const filter: FilterQuery<IYarn> = {};

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

    // 2. Active status filtering based on role and query
    if (actor.role === UserRole.OPERATOR || actor.role === UserRole.VIEWER) {
      // Operators and Viewers can ONLY see active records
      filter.isActive = true;
    } else {
      // Super Admin, Factory Admin, Manager can filter by isActive
      if (query.isActive === 'true' || query.isActive === true) {
        filter.isActive = true;
      } else if (query.isActive === 'false' || query.isActive === false) {
        filter.isActive = false;
      }
      // if 'all' or undefined, no isActive filter applied
    }

    // 3. Yarn type filter
    if (query.yarnType && Object.values(YarnType).includes(query.yarnType)) {
      filter.yarnType = query.yarnType;
    }

    // 4. Safe Search (by yarn name or denier)
    if (query.search && query.search.trim().length > 0) {
      const trimmedSearch = query.search.trim();
      const escaped = escapeRegex(trimmedSearch);
      const parsedNumber = parseFloat(trimmedSearch);

      if (!isNaN(parsedNumber) && Number.isFinite(parsedNumber)) {
        filter.$or = [
          { name: { $regex: escaped, $options: 'i' } },
          { denier: parsedNumber },
        ];
      } else {
        filter.name = { $regex: escaped, $options: 'i' };
      }
    }

    // 5. Pagination & Sorting
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const skip = (page - 1) * limit;

    const allowedSortFields = ['name', 'denier', 'rate', 'createdAt', 'updatedAt'];
    const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'updatedAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

    const [totalItems, yarns] = await Promise.all([
      Yarn.countDocuments(filter),
      Yarn.find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: yarns.map(toSafeYarn),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Get single yarn by ID with factory isolation and role access rules.
   */
  static async getYarnById(id: string, actor: IUser): Promise<SafeYarn> {
    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid yarn ID');
    }

    const yarn = await Yarn.findById(id).exec();
    if (!yarn) {
      throw ApiError.notFound('Yarn not found');
    }

    // Enforce factory isolation: do not reveal that record exists in another factory
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      (!actor.factoryId || yarn.factoryId.toString() !== actor.factoryId.toString())
    ) {
      throw ApiError.notFound('Yarn not found');
    }

    // Operators and Viewers can only view active records
    if (
      (actor.role === UserRole.OPERATOR || actor.role === UserRole.VIEWER) &&
      !yarn.isActive
    ) {
      throw ApiError.notFound('Yarn not found');
    }

    return toSafeYarn(yarn);
  }

  /**
   * Update yarn specifications.
   * Permitted roles: SUPER_ADMIN, FACTORY_ADMIN.
   * Client cannot overwrite: _id, factoryId, createdBy, createdAt, updatedAt, isActive.
   */
  static async updateYarn(
    id: string,
    input: UpdateYarnInput,
    actor: IUser,
  ): Promise<SafeYarn> {
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.FACTORY_ADMIN
    ) {
      throw new ApiError(403, 'Insufficient permissions to update yarn');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid yarn ID');
    }

    const yarn = await Yarn.findById(id).exec();
    if (!yarn) {
      throw ApiError.notFound('Yarn not found');
    }

    // Factory isolation
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      (!actor.factoryId || yarn.factoryId.toString() !== actor.factoryId.toString())
    ) {
      throw ApiError.notFound('Yarn not found');
    }

    // Calculate prospective normalized values for duplicate check
    const newName = input.name !== undefined ? input.name.trim() : yarn.name;
    const newNormalizedName = normalizeYarnName(newName);
    const newDenier = input.denier !== undefined ? input.denier : yarn.denier;
    const newYarnType = input.yarnType !== undefined ? input.yarnType : yarn.yarnType;

    // Check if another yarn in the same factory already has these exact specs
    const duplicate = await Yarn.findOne({
      _id: { $ne: yarn._id },
      factoryId: yarn.factoryId,
      normalizedName: newNormalizedName,
      denier: newDenier,
      yarnType: newYarnType,
    });

    if (duplicate) {
      throw new ApiError(
        409,
        'A yarn with the same name, denier, and type already exists in this factory',
      );
    }

    // Apply allowed updates
    if (input.name !== undefined) {
      yarn.name = input.name.trim();
      yarn.normalizedName = newNormalizedName;
    }
    if (input.denier !== undefined) {
      yarn.denier = input.denier;
    }
    if (input.yarnType !== undefined) {
      yarn.yarnType = input.yarnType;
    }
    if (input.rate !== undefined) {
      yarn.rate = input.rate;
    }
    if (input.rateUnit !== undefined) {
      yarn.rateUnit = input.rateUnit;
    }
    if (input.description !== undefined) {
      yarn.description = input.description.trim();
    }

    yarn.updatedBy = actor._id;

    try {
      await yarn.save();
      return toSafeYarn(yarn);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new ApiError(
          409,
          'A yarn with the same name, denier, and type already exists in this factory',
        );
      }
      throw err;
    }
  }

  /**
   * Soft activation / deactivation of yarn.
   * Permitted roles: SUPER_ADMIN, FACTORY_ADMIN.
   * Never permanently deletes yarn records.
   */
  static async updateYarnStatus(
    id: string,
    isActive: boolean,
    actor: IUser,
  ): Promise<SafeYarn> {
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.FACTORY_ADMIN
    ) {
      throw new ApiError(403, 'Insufficient permissions to change yarn status');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid yarn ID');
    }

    const yarn = await Yarn.findById(id).exec();
    if (!yarn) {
      throw ApiError.notFound('Yarn not found');
    }

    // Factory isolation
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      (!actor.factoryId || yarn.factoryId.toString() !== actor.factoryId.toString())
    ) {
      throw ApiError.notFound('Yarn not found');
    }

    yarn.isActive = isActive;
    yarn.updatedBy = actor._id;

    await yarn.save();
    return toSafeYarn(yarn);
  }
}
