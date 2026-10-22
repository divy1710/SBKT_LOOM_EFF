import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';

import { User, UserRole, toSafeUser, outranks, USER_MANAGEMENT_ROLES } from '../user/user.model';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { auditService } from '../audit/audit.service';
import {
  createUserSchema,
  updateUserSchema,
  statusChangeSchema,
  userListQuerySchema,
} from '../auth/auth.schemas';

const BCRYPT_ROUNDS = 12;

// ─── GET /api/v1/users ────────────────────────────────────────────────────────
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = userListQuerySchema.safeParse(req.query);
    if (!parsed.success) return next(ApiError.badRequest('Invalid query parameters'));
    const { page, limit, search, role, isActive } = parsed.data;

    const actor = req.user!;
    const filter: Record<string, unknown> = {};

    // Factory admins can only see their own factory's users
    if (actor.role === UserRole.FACTORY_ADMIN) {
      filter['factoryId'] = actor.factoryId;
    } else if (actor.role === UserRole.SUPER_ADMIN && req.query.factoryId) {
      if (Types.ObjectId.isValid(req.query.factoryId as string)) {
        filter['factoryId'] = new Types.ObjectId(req.query.factoryId as string);
      }
    }

    if (search) {
      filter['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) filter['role'] = role;
    if (isActive !== undefined) filter['isActive'] = isActive;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      User.countDocuments(filter).exec(),
    ]);

    res.status(200).json(
      new ApiResponse('Users retrieved', {
        users: users.map(toSafeUser),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }).toJSON(),
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/users/:id ────────────────────────────────────────────────────
export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    if (!Types.ObjectId.isValid(id ?? '')) return next(ApiError.notFound('User not found'));

    const actor = req.user!;
    const user = await User.findById(id).exec();
    if (!user) return next(ApiError.notFound('User not found'));

    // Factory admins can only see their own factory
    if (
      actor.role === UserRole.FACTORY_ADMIN &&
      user.factoryId?.toString() !== actor.factoryId?.toString()
    ) {
      return next(ApiError.notFound('User not found'));
    }

    res.status(200).json(new ApiResponse('User retrieved', { user: toSafeUser(user) }).toJSON());
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/users ───────────────────────────────────────────────────────
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(ApiError.badRequest(parsed.error.issues.map((i) => i.message).join('; ')));
    }
    const { name, email, password, role: roleStr, factoryId } = parsed.data;

    const actor = req.user!;

    // Validate the requested role
    if (!Object.values(UserRole).includes(roleStr as UserRole)) {
      return next(ApiError.badRequest('Invalid role'));
    }
    const targetRole = roleStr as UserRole;

    // Prevent privilege escalation: actor cannot assign a role ≥ their own
    if (!outranks(actor.role, targetRole) && actor.role !== targetRole) {
      // Allow assigning same-level only for SUPER_ADMIN
      if (actor.role !== UserRole.SUPER_ADMIN) {
        return next(new ApiError(403, 'Cannot assign a role equal to or higher than your own'));
      }
    }

    // FACTORY_ADMIN cannot create SUPER_ADMIN or FACTORY_ADMIN
    if (
      actor.role === UserRole.FACTORY_ADMIN &&
      (targetRole === UserRole.SUPER_ADMIN || targetRole === UserRole.FACTORY_ADMIN)
    ) {
      return next(new ApiError(403, 'Factory Admin cannot create administrative roles'));
    }

    // Determine factory
    let resolvedFactoryId: string | undefined = factoryId;
    if (actor.role === UserRole.FACTORY_ADMIN) {
      resolvedFactoryId = actor.factoryId?.toString();
    }

    const existing = await User.findOne({ email }).exec();
    if (existing) return next(new ApiError(409, 'Email already in use'));

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: targetRole,
      factoryId: resolvedFactoryId,
      isActive: true,
    });

    await auditService.logEvent({
      actor: {
        _id: actor._id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
      action: 'USER_CREATED',
      resourceType: 'USER',
      resourceId: user._id.toString(),
      factoryId: resolvedFactoryId,
      details: { name: user.name, email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    res.status(201).json(new ApiResponse('User created', { user: toSafeUser(user) }).toJSON());
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/v1/users/:id ──────────────────────────────────────────────────
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    if (!Types.ObjectId.isValid(id ?? '')) return next(ApiError.notFound('User not found'));

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(ApiError.badRequest(parsed.error.issues.map((i) => i.message).join('; ')));
    }

    const actor = req.user!;
    const target = await User.findById(id).exec();
    if (!target) return next(ApiError.notFound('User not found'));

    // Factory admin boundary
    if (
      actor.role === UserRole.FACTORY_ADMIN &&
      target.factoryId?.toString() !== actor.factoryId?.toString()
    ) {
      return next(ApiError.notFound('User not found'));
    }

    // Users cannot update themselves via this endpoint (use /me)
    if (target._id.toString() === actor._id.toString()) {
      return next(new ApiError(403, 'Use /auth/me to update your own profile'));
    }

    const { name, email, factoryId } = parsed.data;

    // Factory re-assignment can only be performed by SUPER_ADMIN
    if (factoryId !== undefined && actor.role !== UserRole.SUPER_ADMIN) {
      return next(new ApiError(403, 'Only Super Admin can reassign user factories'));
    }

    if (email && email !== target.email) {
      const taken = await User.findOne({ email }).exec();
      if (taken) return next(new ApiError(409, 'Email already in use'));
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { ...(name && { name }), ...(email && { email }), ...(factoryId !== undefined && { factoryId }) },
      { new: true, runValidators: true },
    ).exec();

    await auditService.logEvent({
      actor: {
        _id: actor._id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
      action: 'USER_UPDATED',
      resourceType: 'USER',
      resourceId: target._id.toString(),
      factoryId: updated?.factoryId?.toString() ?? target.factoryId?.toString(),
      details: { updatedFields: Object.keys(parsed.data) },
      ipAddress: req.ip,
    });

    res.status(200).json(new ApiResponse('User updated', { user: toSafeUser(updated!) }).toJSON());
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/v1/users/:id/status ──────────────────────────────────────────
export const changeUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    if (!Types.ObjectId.isValid(id ?? '')) return next(ApiError.notFound('User not found'));

    const parsed = statusChangeSchema.safeParse(req.body);
    if (!parsed.success) return next(ApiError.badRequest('isActive must be a boolean'));

    const actor = req.user!;
    const target = await User.findById(id).exec();
    if (!target) return next(ApiError.notFound('User not found'));

    // Cannot deactivate yourself
    if (target._id.toString() === actor._id.toString()) {
      return next(new ApiError(403, 'Cannot change your own active status'));
    }

    // Factory boundary
    if (
      actor.role === UserRole.FACTORY_ADMIN &&
      target.factoryId?.toString() !== actor.factoryId?.toString()
    ) {
      return next(ApiError.notFound('User not found'));
    }

    // Prevent deactivating the last active factory admin
    if (!parsed.data.isActive && target.role === UserRole.FACTORY_ADMIN) {
      const activeAdminCount = await User.countDocuments({
        factoryId: target.factoryId,
        role: UserRole.FACTORY_ADMIN,
        isActive: true,
        _id: { $ne: target._id },
      }).exec();
      if (activeAdminCount === 0) {
        return next(new ApiError(409, 'Cannot deactivate the last active factory administrator'));
      }
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { isActive: parsed.data.isActive },
      { new: true },
    ).exec();

    await auditService.logEvent({
      actor: {
        _id: actor._id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
      action: 'USER_STATUS_CHANGED',
      resourceType: 'USER',
      resourceId: target._id.toString(),
      factoryId: target.factoryId?.toString(),
      details: { isActive: parsed.data.isActive },
      ipAddress: req.ip,
    });

    res.status(200).json(
      new ApiResponse(
        `User ${parsed.data.isActive ? 'activated' : 'deactivated'}`,
        { user: toSafeUser(updated!) },
      ).toJSON(),
    );
  } catch (err) {
    next(err);
  }
};

