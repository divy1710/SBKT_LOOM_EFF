import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../user/user.model';
import { ApiError } from '../../utils/ApiError';

export type Permission =
  | 'factory.read'
  | 'factory.create'
  | 'factory.update'
  | 'factory.deactivate'
  | 'factory.admin.manage'
  | 'user.read'
  | 'user.create'
  | 'user.update'
  | 'user.deactivate'
  | 'role.read'
  | 'role.assign'
  | 'yarn.read'
  | 'yarn.create'
  | 'yarn.update'
  | 'yarn.delete'
  | 'fabric.read'
  | 'fabric.create'
  | 'fabric.update'
  | 'fabric.delete'
  | 'beam.read'
  | 'beam.create'
  | 'beam.update'
  | 'beam.delete'
  | 'machine.read'
  | 'machine.create'
  | 'machine.update'
  | 'machine.delete'
  | 'production.read'
  | 'production.create'
  | 'production.update'
  | 'production.delete'
  | 'analytics.read'
  | 'analytics.cross_factory'
  | 'settings.read'
  | 'settings.update'
  | 'backup.create'
  | 'backup.restore'
  | 'audit.read';

export const ALL_PERMISSIONS: Permission[] = [
  'factory.read',
  'factory.create',
  'factory.update',
  'factory.deactivate',
  'factory.admin.manage',
  'user.read',
  'user.create',
  'user.update',
  'user.deactivate',
  'role.read',
  'role.assign',
  'yarn.read',
  'yarn.create',
  'yarn.update',
  'yarn.delete',
  'fabric.read',
  'fabric.create',
  'fabric.update',
  'fabric.delete',
  'beam.read',
  'beam.create',
  'beam.update',
  'beam.delete',
  'machine.read',
  'machine.create',
  'machine.update',
  'machine.delete',
  'production.read',
  'production.create',
  'production.update',
  'production.delete',
  'analytics.read',
  'analytics.cross_factory',
  'settings.read',
  'settings.update',
  'backup.create',
  'backup.restore',
  'audit.read',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [...ALL_PERMISSIONS],
  [UserRole.FACTORY_ADMIN]: [
    'factory.read',
    'factory.update',
    'user.read',
    'user.create',
    'user.update',
    'user.deactivate',
    'role.read',
    'yarn.read',
    'yarn.create',
    'yarn.update',
    'yarn.delete',
    'fabric.read',
    'fabric.create',
    'fabric.update',
    'fabric.delete',
    'beam.read',
    'beam.create',
    'beam.update',
    'beam.delete',
    'machine.read',
    'machine.create',
    'machine.update',
    'machine.delete',
    'production.read',
    'production.create',
    'production.update',
    'production.delete',
    'analytics.read',
    'settings.read',
    'settings.update',
    'backup.create',
    'backup.restore',
    'audit.read',
  ],
  [UserRole.MANAGER]: [
    'yarn.read',
    'yarn.create',
    'yarn.update',
    'fabric.read',
    'fabric.create',
    'fabric.update',
    'beam.read',
    'beam.create',
    'beam.update',
    'machine.read',
    'machine.update',
    'production.read',
    'production.create',
    'production.update',
    'analytics.read',
    'settings.read',
  ],
  [UserRole.OPERATOR]: [
    'yarn.read',
    'fabric.read',
    'beam.read',
    'machine.read',
    'production.read',
    'production.create',
  ],
  [UserRole.VIEWER]: [
    'yarn.read',
    'fabric.read',
    'beam.read',
    'machine.read',
    'production.read',
    'analytics.read',
  ],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
};

export const requirePermission = (permission: Permission) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!hasPermission(req.user.role, permission)) {
      return next(ApiError.forbidden(`Missing required permission: ${permission}`));
    }
    next();
  };
};
