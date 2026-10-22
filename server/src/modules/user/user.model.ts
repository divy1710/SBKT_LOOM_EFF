import { Schema, model, Document, Types } from 'mongoose';

// ─── Role Enum ────────────────────────────────────────────────────────────────
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FACTORY_ADMIN = 'FACTORY_ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

// ─── Role hierarchy helper ────────────────────────────────────────────────────
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.FACTORY_ADMIN]: 4,
  [UserRole.MANAGER]: 3,
  [UserRole.OPERATOR]: 2,
  [UserRole.VIEWER]: 1,
};

/** Returns true if the actor role outranks the target role. */
export const outranks = (actor: UserRole, target: UserRole): boolean =>
  ROLE_HIERARCHY[actor] > ROLE_HIERARCHY[target];

// ─── Roles that can manage users ─────────────────────────────────────────────
export const USER_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FACTORY_ADMIN,
];

export interface IUserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: 'en' | 'gu' | 'hi';
}

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  factoryId?: Types.ObjectId;
  preferences?: IUserPreferences;
  isActive: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Safe user DTO (never exposes passwordHash) ───────────────────────────────
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  factoryId?: string;
  factoryName?: string;
  factoryTimezone?: string;
  factoryLogo?: string;
  preferences?: IUserPreferences;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeUser(user: IUser): SafeUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    factoryId: user.factoryId?.toString(),
    preferences: user.preferences,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'Role is required'],
    },
    factoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Factory',
      default: undefined,
    },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
      language: { type: String, enum: ['en', 'gu', 'hi'], default: 'en' },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    // Ensure passwordHash never leaks via toJSON/toObject
    toJSON: {
      transform: (_doc, ret) => {
        const r = ret as Record<string, unknown>;
        delete r['passwordHash'];
        delete r['__v'];
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        const r = ret as Record<string, unknown>;
        delete r['passwordHash'];
        delete r['__v'];
        return ret;
      },
    },
  },
);

// ─── Additional indexes (factoryId and role queries) ─────────────────────────
// Note: email index is already created by { unique: true } on the field itself.
userSchema.index({ factoryId: 1 });
userSchema.index({ role: 1, isActive: 1 });

export const User = model<IUser>('User', userSchema);
