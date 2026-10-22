import mongoose from 'mongoose';
import { AuditLog, IAuditLog, AuditAction } from './audit.model';
import { UserRole } from '../user/user.model';

export interface LogEventParams {
  actor: {
    _id?: mongoose.Types.ObjectId | string;
    id?: string;
    name: string;
    email: string;
    role: UserRole;
  };
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string;
  factoryId?: mongoose.Types.ObjectId | string;
  factoryName?: string;
  outcome?: 'SUCCESS' | 'FAILURE';
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditQueryOptions {
  page?: number;
  limit?: number;
  factoryId?: string;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class AuditService {
  /**
   * Safely records an administrative audit event without throwing errors to the caller
   */
  async logEvent(params: LogEventParams): Promise<void> {
    try {
      const actorId = params.actor._id || params.actor.id;
      if (!actorId) return;

      // Never log sensitive passwords, tokens, or credentials
      const sanitizedDetails = params.details ? { ...params.details } : undefined;
      if (sanitizedDetails) {
        delete (sanitizedDetails as any).password;
        delete (sanitizedDetails as any).passwordHash;
        delete (sanitizedDetails as any).token;
        delete (sanitizedDetails as any).refreshToken;
      }

      await AuditLog.create({
        actorId,
        actorName: params.actor.name,
        actorEmail: params.actor.email,
        actorRole: params.actor.role,
        factoryId: params.factoryId ? new mongoose.Types.ObjectId(params.factoryId.toString()) : undefined,
        factoryName: params.factoryName,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        outcome: params.outcome || 'SUCCESS',
        details: sanitizedDetails,
        ipAddress: params.ipAddress,
      });
    } catch (err) {
      console.warn('[AuditService] Failed to record audit log event:', err);
    }
  }

  /**
   * Queries audit logs with pagination and filters
   */
  async listLogs(options: AuditQueryOptions) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (options.factoryId && mongoose.Types.ObjectId.isValid(options.factoryId)) {
      filter['factoryId'] = new mongoose.Types.ObjectId(options.factoryId);
    }

    if (options.action) {
      filter['action'] = options.action;
    }

    if (options.actorId && mongoose.Types.ObjectId.isValid(options.actorId)) {
      filter['actorId'] = new mongoose.Types.ObjectId(options.actorId);
    }

    if (options.startDate || options.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (options.startDate) {
        dateFilter['$gte'] = new Date(options.startDate);
      }
      if (options.endDate) {
        const end = new Date(options.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter['$lte'] = end;
      }
      filter['createdAt'] = dateFilter;
    }

    if (options.search) {
      const term = options.search.trim();
      filter['$or'] = [
        { actorName: { $regex: term, $options: 'i' } },
        { actorEmail: { $regex: term, $options: 'i' } },
        { action: { $regex: term, $options: 'i' } },
        { resourceType: { $regex: term, $options: 'i' } },
        { factoryName: { $regex: term, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log._id.toString(),
        timestamp: log.createdAt || log.timestamp,
        actorId: log.actorId?.toString(),
        actorName: log.actorName,
        actorEmail: log.actorEmail,
        actorRole: log.actorRole,
        factoryId: log.factoryId?.toString(),
        factoryName: log.factoryName,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        outcome: log.outcome,
        details: log.details,
        ipAddress: log.ipAddress,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const auditService = new AuditService();
