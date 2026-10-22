import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from '../user/user.model';

export type AuditAction =
  | 'FACTORY_CREATED'
  | 'FACTORY_UPDATED'
  | 'FACTORY_ACTIVATED'
  | 'FACTORY_DEACTIVATED'
  | 'FACTORY_ADMIN_ASSIGNED'
  | 'FACTORY_ADMIN_REASSIGNED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'ROLE_ASSIGNED'
  | 'SETTINGS_UPDATED'
  | 'BACKUP_CREATED'
  | 'RESTORE_EXECUTED'
  | 'RESTORE_FAILED';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  timestamp: Date;
  actorId: Types.ObjectId;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  factoryId?: Types.ObjectId;
  factoryName?: string;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    factoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Factory',
      default: undefined,
      index: true,
    },
    factoryName: {
      type: String,
      default: undefined,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
      default: undefined,
    },
    outcome: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
    },
    details: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    ipAddress: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        (ret as Record<string, unknown>)['__v'] = undefined;
        return ret;
      },
    },
  },
);

auditLogSchema.index({ factoryId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
