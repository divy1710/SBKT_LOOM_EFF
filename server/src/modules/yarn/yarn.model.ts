import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────
export enum YarnType {
  WARP = 'WARP',
  WEFT = 'WEFT',
  BOTH = 'BOTH',
}

export enum RateUnit {
  KG = 'KG',
  CONE = 'CONE',
  OTHER = 'OTHER',
}

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IYarn extends Document {
  _id: Types.ObjectId;
  name: string;
  normalizedName: string; // trimmed and lowercased for duplicate detection
  denier: number;
  yarnType: YarnType;
  rate: number;
  rateUnit: RateUnit;
  description?: string;
  factoryId: Types.ObjectId;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Safe Yarn DTO ────────────────────────────────────────────────────────────
export interface SafeYarn {
  id: string;
  name: string;
  denier: number;
  yarnType: YarnType;
  rate: number;
  rateUnit: RateUnit;
  description?: string;
  factoryId: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeYarn(yarn: IYarn): SafeYarn {
  return {
    id: yarn._id.toString(),
    name: yarn.name,
    denier: yarn.denier,
    yarnType: yarn.yarnType,
    rate: yarn.rate,
    rateUnit: yarn.rateUnit,
    description: yarn.description,
    factoryId: yarn.factoryId.toString(),
    isActive: yarn.isActive,
    createdBy: yarn.createdBy.toString(),
    updatedBy: yarn.updatedBy.toString(),
    createdAt: yarn.createdAt,
    updatedAt: yarn.updatedAt,
  };
}

export function normalizeYarnName(name: string): string {
  return name.trim().toLowerCase();
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const yarnSchema = new Schema<IYarn>(
  {
    name: {
      type: String,
      required: [true, 'Yarn name is required'],
      trim: true,
      maxlength: [100, 'Yarn name cannot exceed 100 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    denier: {
      type: Number,
      required: [true, 'Denier is required'],
      min: [0.001, 'Denier must be greater than zero'],
    },
    yarnType: {
      type: String,
      enum: {
        values: Object.values(YarnType),
        message: 'Yarn type must be WARP, WEFT, or BOTH',
      },
      required: [true, 'Yarn type is required'],
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate must be zero or greater'],
    },
    rateUnit: {
      type: String,
      enum: {
        values: Object.values(RateUnit),
        message: 'Rate unit must be KG, CONE, or OTHER',
      },
      default: RateUnit.KG,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
    },
    factoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Factory',
      required: [true, 'Factory ID is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Updated by is required'],
    },
  },
  {
    timestamps: true,
  },
);

// ─── Pre-validate middleware to sync normalizedName ───────────────────────────
yarnSchema.pre('validate', function (next) {
  if (this.name) {
    this.normalizedName = normalizeYarnName(this.name);
  }
  next();
});

// ─── Unique Compound Index for Concurrent-Safe Duplicate Prevention ───────────
// A yarn is identified by its normalized name, denier, and yarn type within a factory.
yarnSchema.index(
  { factoryId: 1, normalizedName: 1, denier: 1, yarnType: 1 },
  { unique: true, name: 'uniq_factory_yarn_spec' },
);

// ─── Performance Indexes ──────────────────────────────────────────────────────
yarnSchema.index({ factoryId: 1, isActive: 1 });
yarnSchema.index({ factoryId: 1, yarnType: 1 });
yarnSchema.index({ factoryId: 1, createdAt: -1 });

export const Yarn = model<IYarn>('Yarn', yarnSchema);
