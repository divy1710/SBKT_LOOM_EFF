import mongoose from 'mongoose';
import { Factory, IFactory, FactoryStatus } from './factory.model';
import { User, UserRole } from '../user/user.model';
import { Machine } from '../machine/machine.model';
import { Yarn } from '../yarn/yarn.model';
import { Fabric } from '../fabric/fabric.model';
import { Beam } from '../beam/beam.model';
import { ProductionSheet } from '../production/production.model';
import { AuditLog } from '../audit/audit.model';
import { auditService } from '../audit/audit.service';
import { ApiError } from '../../utils/ApiError';

export interface CreateFactoryInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  logo?: string | null;
  timezone?: string;
  status?: FactoryStatus;
}

export interface UpdateFactoryInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  logo?: string | null;
  timezone?: string;
  status?: FactoryStatus;
}

export interface ListFactoriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
}

export class FactoryService {
  /**
   * Lists factories with pagination, search, status filter, and real aggregated counts
   */
  async listFactories(query: ListFactoriesQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.status && query.status !== 'ALL') {
      filter['status'] = query.status;
    }

    if (query.search) {
      const term = query.search.trim();
      filter['$or'] = [
        { name: { $regex: term, $options: 'i' } },
        { code: { $regex: term, $options: 'i' } },
        { city: { $regex: term, $options: 'i' } },
        { state: { $regex: term, $options: 'i' } },
      ];
    }

    const [factories, total] = await Promise.all([
      Factory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Factory.countDocuments(filter),
    ]);

    // Populate real counts and assigned Factory Admin for each factory
    const enrichedFactories = await Promise.all(
      factories.map(async (f) => {
        const [userCount, machineCount, adminUser] = await Promise.all([
          User.countDocuments({ factoryId: f._id }),
          Machine.countDocuments({ factoryId: f._id }),
          User.findOne({ factoryId: f._id, role: UserRole.FACTORY_ADMIN })
            .select('name email lastLoginAt')
            .lean(),
        ]);

        return {
          id: f._id.toString(),
          name: f.name,
          code: f.code,
          factoryName: f.name,
          factoryCode: f.code,
          address: f.address,
          city: f.city || '',
          state: f.state || '',
          country: f.country || 'India',
          phone: f.phone,
          contactNumber: f.phone,
          email: f.email,
          contactEmail: f.email,
          logo: f.logo,
          timezone: f.timezone,
          status: f.status || (f.isActive ? 'ACTIVE' : 'INACTIVE'),
          isActive: f.isActive,
          userCount,
          machineCount,
          admin: adminUser
            ? {
                id: adminUser._id.toString(),
                name: adminUser.name,
                email: adminUser.email,
                lastLoginAt: adminUser.lastLoginAt,
              }
            : null,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        };
      }),
    );

    return {
      factories: enrichedFactories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Creates a new factory
   */
  async createFactory(input: CreateFactoryInput, actor: any) {
    const normalizedCode = input.code.trim().toUpperCase();

    // Check duplicate code
    const existing = await Factory.findOne({ code: normalizedCode });
    if (existing) {
      throw ApiError.badRequest(`Factory with code "${normalizedCode}" already exists.`);
    }

    const factory = await Factory.create({
      name: input.name.trim(),
      code: normalizedCode,
      address: input.address?.trim(),
      city: input.city?.trim() || '',
      state: input.state?.trim() || '',
      country: input.country?.trim() || 'India',
      phone: input.phone?.trim(),
      email: input.email ? input.email.trim().toLowerCase() : undefined,
      logo: input.logo,
      timezone: input.timezone?.trim() || 'Asia/Kolkata',
      status: input.status || 'ACTIVE',
      isActive: (input.status || 'ACTIVE') === 'ACTIVE',
      createdBy: actor._id || actor.id,
    });

    // Record audit log
    await auditService.logEvent({
      actor,
      action: 'FACTORY_CREATED',
      resourceType: 'Factory',
      resourceId: factory._id.toString(),
      factoryId: factory._id,
      factoryName: factory.name,
      details: {
        name: factory.name,
        code: factory.code,
        status: factory.status,
      },
    });

    return factory;
  }

  /**
   * Retrieves comprehensive factory details and statistics
   */
  async getFactoryDetails(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid factory identifier.');
    }

    const factory = await Factory.findById(id).lean();
    if (!factory) {
      throw ApiError.notFound('Factory not found.');
    }

    const factoryId = factory._id;

    const [
      userCount,
      machineCount,
      yarnCount,
      fabricCount,
      beamCount,
      productionSheetCount,
      adminUsers,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments({ factoryId }),
      Machine.countDocuments({ factoryId }),
      Yarn.countDocuments({ factoryId }),
      Fabric.countDocuments({ factoryId }),
      Beam.countDocuments({ factoryId }),
      ProductionSheet.countDocuments({ factoryId }),
      User.find({ factoryId, role: UserRole.FACTORY_ADMIN })
        .select('name email isActive lastLoginAt')
        .lean(),
      AuditLog.find({ factoryId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return {
      id: factory._id.toString(),
      name: factory.name,
      code: factory.code,
      factoryName: factory.name,
      factoryCode: factory.code,
      address: factory.address,
      city: factory.city || '',
      state: factory.state || '',
      country: factory.country || 'India',
      phone: factory.phone,
      contactNumber: factory.phone,
      email: factory.email,
      contactEmail: factory.email,
      logo: factory.logo,
      timezone: factory.timezone,
      status: factory.status || (factory.isActive ? 'ACTIVE' : 'INACTIVE'),
      isActive: factory.isActive,
      productionPreferences: factory.productionPreferences,
      counts: {
        users: userCount,
        machines: machineCount,
        yarns: yarnCount,
        fabrics: fabricCount,
        beams: beamCount,
        productionSheets: productionSheetCount,
      },
      admins: adminUsers.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        email: a.email,
        isActive: a.isActive,
        lastLoginAt: a.lastLoginAt,
      })),
      recentActivity: recentActivity.map((log) => ({
        id: log._id.toString(),
        timestamp: log.createdAt || log.timestamp,
        actorName: log.actorName,
        action: log.action,
        resourceType: log.resourceType,
        outcome: log.outcome,
      })),
      createdAt: factory.createdAt,
      updatedAt: factory.updatedAt,
    };
  }

  /**
   * Updates an existing factory profile
   */
  async updateFactory(id: string, input: UpdateFactoryInput, actor: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid factory identifier.');
    }

    const factory = await Factory.findById(id);
    if (!factory) {
      throw ApiError.notFound('Factory not found.');
    }

    if (input.name) factory.name = input.name.trim();
    if (input.address !== undefined) factory.address = input.address.trim();
    if (input.city !== undefined) factory.city = input.city.trim();
    if (input.state !== undefined) factory.state = input.state.trim();
    if (input.country !== undefined) factory.country = input.country.trim();
    if (input.phone !== undefined) factory.phone = input.phone.trim();
    if (input.email !== undefined) {
      factory.email = input.email ? input.email.trim().toLowerCase() : undefined;
    }
    if (input.logo !== undefined) factory.logo = input.logo || undefined;
    if (input.timezone) factory.timezone = input.timezone.trim();
    if (input.status) {
      factory.status = input.status;
      factory.isActive = input.status === 'ACTIVE';
    }

    await factory.save();

    await auditService.logEvent({
      actor,
      action: 'FACTORY_UPDATED',
      resourceType: 'Factory',
      resourceId: factory._id.toString(),
      factoryId: factory._id,
      factoryName: factory.name,
      details: {
        name: factory.name,
        status: factory.status,
      },
    });

    return factory;
  }

  /**
   * Sets factory status (ACTIVE or INACTIVE)
   */
  async setFactoryStatus(id: string, status: FactoryStatus, actor: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid factory identifier.');
    }

    const factory = await Factory.findById(id);
    if (!factory) {
      throw ApiError.notFound('Factory not found.');
    }

    factory.status = status;
    factory.isActive = status === 'ACTIVE';
    await factory.save();

    const action = status === 'ACTIVE' ? 'FACTORY_ACTIVATED' : 'FACTORY_DEACTIVATED';
    await auditService.logEvent({
      actor,
      action,
      resourceType: 'Factory',
      resourceId: factory._id.toString(),
      factoryId: factory._id,
      factoryName: factory.name,
      details: { status },
    });

    return factory;
  }
}

export const factoryService = new FactoryService();
