import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, UserRole, toSafeUser } from '../user/user.model';
import { Factory } from './factory.model';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { auditService } from '../audit/audit.service';
import { z } from 'zod';

const BCRYPT_ROUNDS = 12;

const createFactoryAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
  factoryId: z.string({ required_error: 'Factory assignment is required' }),
});

const assignFactoryAdminSchema = z.object({
  factoryId: z.string({ required_error: 'Target factory ID is required' }),
});

export class FactoryAdminController {
  /**
   * GET /api/v1/factory-admins
   * Lists all Factory Admins across the platform with their assigned factory details
   */
  async listFactoryAdmins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admins = await User.find({ role: UserRole.FACTORY_ADMIN })
        .sort({ createdAt: -1 })
        .lean();

      const enriched = await Promise.all(
        admins.map(async (u) => {
          let factoryInfo = null;
          if (u.factoryId) {
            const f = await Factory.findById(u.factoryId).select('name code status isActive').lean();
            if (f) {
              factoryInfo = {
                id: f._id.toString(),
                name: f.name,
                code: f.code,
                status: f.status || (f.isActive ? 'ACTIVE' : 'INACTIVE'),
              };
            }
          }

          return {
            ...toSafeUser(u as any),
            assignedFactory: factoryInfo,
          };
        }),
      );

      res.status(200).json(new ApiResponse('Factory administrators retrieved', enriched).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/factory-admins
   * Creates a new Factory Admin account assigned to a factory
   */
  async createFactoryAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createFactoryAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const { name, email, password, factoryId } = parsed.data;

      if (!mongoose.Types.ObjectId.isValid(factoryId)) {
        return next(ApiError.badRequest('Invalid factory identifier.'));
      }

      const factory = await Factory.findById(factoryId);
      if (!factory) {
        return next(ApiError.notFound('Target factory not found.'));
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(ApiError.badRequest('An account with this email already exists.'));
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const admin = await User.create({
        name,
        email,
        passwordHash,
        role: UserRole.FACTORY_ADMIN,
        factoryId: factory._id,
        isActive: true,
      });

      await auditService.logEvent({
        actor: req.user!,
        action: 'FACTORY_ADMIN_ASSIGNED',
        resourceType: 'User',
        resourceId: admin._id.toString(),
        factoryId: factory._id,
        factoryName: factory.name,
        details: {
          adminName: admin.name,
          adminEmail: admin.email,
          factoryCode: factory.code,
        },
      });

      res.status(201).json(new ApiResponse('Factory administrator created successfully', toSafeUser(admin)).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/factory-admins/:id/assign
   * Assigns or reassigns an existing Factory Admin to another factory
   */
  async assignFactoryAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const parsed = assignFactoryAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const { factoryId } = parsed.data;
      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(factoryId)) {
        return next(ApiError.badRequest('Invalid identifiers.'));
      }

      const [user, factory] = await Promise.all([
        User.findById(id),
        Factory.findById(factoryId),
      ]);

      if (!user) return next(ApiError.notFound('User not found.'));
      if (!factory) return next(ApiError.notFound('Target factory not found.'));

      const previousFactoryId = user.factoryId;
      user.factoryId = factory._id as mongoose.Types.ObjectId;
      user.role = UserRole.FACTORY_ADMIN;
      await user.save();

      await auditService.logEvent({
        actor: req.user!,
        action: 'FACTORY_ADMIN_REASSIGNED',
        resourceType: 'User',
        resourceId: user._id.toString(),
        factoryId: factory._id,
        factoryName: factory.name,
        details: {
          adminEmail: user.email,
          previousFactoryId: previousFactoryId?.toString(),
          newFactoryId: factory._id.toString(),
        },
      });

      res.status(200).json(new ApiResponse('Factory administrator reassigned successfully', toSafeUser(user)).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/factory-admins/:id/status
   * Toggles active status of a Factory Admin
   */
  async setFactoryAdminStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return next(ApiError.badRequest('isActive must be a boolean.'));
      }

      const user = await User.findById(id);
      if (!user) return next(ApiError.notFound('User not found.'));

      user.isActive = isActive;
      await user.save();

      const action = isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
      await auditService.logEvent({
        actor: req.user!,
        action,
        resourceType: 'User',
        resourceId: user._id.toString(),
        factoryId: user.factoryId,
        details: {
          adminEmail: user.email,
          isActive,
        },
      });

      res.status(200).json(new ApiResponse(`Factory admin status updated`, toSafeUser(user)).toJSON());
    } catch (err) {
      next(err);
    }
  }
}

export const factoryAdminController = new FactoryAdminController();
