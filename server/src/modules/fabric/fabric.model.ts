import { Schema, model, Document, Types } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IFabric extends Document {
  _id: Types.ObjectId;
  name: string;
  normalizedName: string; // trimmed + lowercased for duplicate detection
  code: string;           // fabric code (e.g. SBK-100) — unique within factory
  normalizedCode: string; // lowercased code for duplicate detection
  warpYarnId: Types.ObjectId;
  weftYarnId: Types.ObjectId;
  ppi: number;            // picks per inch
  panno: number;          // panno (cloth fell width / fabric specification, preserves decimals)
  wastagePercent: number; // 0–100
  recommendedRpm?: number;
  description?: string;
  factoryId: Types.ObjectId;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Safe DTO ─────────────────────────────────────────────────────────────────
export interface SafeFabric {
  id: string;
  name: string;
  code: string;
  warpYarnId: string;
  weftYarnId: string;
  ppi: number;
  panno: number;
  wastagePercent: number;
  recommendedRpm?: number;
  description?: string;
  factoryId: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeFabric(fabric: IFabric): SafeFabric {
  // Gracefully fallback to legacy `pano` field if present on older unmigrated document
  const rawDoc = fabric as unknown as Record<string, unknown>;
  const resolvedPanno =
    typeof fabric.panno === 'number'
      ? fabric.panno
      : typeof rawDoc['pano'] === 'number'
        ? (rawDoc['pano'] as number)
        : 0;

  return {
    id: fabric._id.toString(),
    name: fabric.name,
    code: fabric.code,
    warpYarnId: fabric.warpYarnId.toString(),
    weftYarnId: fabric.weftYarnId.toString(),
    ppi: fabric.ppi,
    panno: resolvedPanno,
    wastagePercent: fabric.wastagePercent,
    recommendedRpm: fabric.recommendedRpm,
    description: fabric.description,
    factoryId: fabric.factoryId.toString(),
    isActive: fabric.isActive,
    createdBy: fabric.createdBy.toString(),
    updatedBy: fabric.updatedBy.toString(),
    createdAt: fabric.createdAt,
    updatedAt: fabric.updatedAt,
  };
}

export function normalizeFabricName(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeFabricCode(code: string): string {
  return code.trim().toLowerCase();
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const fabricSchema = new Schema<IFabric>(
  {
    name: {
      type: String,
      required: [true, 'Fabric name is required'],
      trim: true,
      maxlength: [120, 'Fabric name cannot exceed 120 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: [true, 'Fabric code is required'],
      trim: true,
      maxlength: [40, 'Fabric code cannot exceed 40 characters'],
    },
    normalizedCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    warpYarnId: {
      type: Schema.Types.ObjectId,
      ref: 'Yarn',
      required: [true, 'Warp yarn is required'],
    },
    weftYarnId: {
      type: Schema.Types.ObjectId,
      ref: 'Yarn',
      required: [true, 'Weft yarn is required'],
    },
    ppi: {
      type: Number,
      required: [true, 'PPI (picks per inch) is required'],
      min: [1, 'PPI must be at least 1'],
    },
    panno: {
      type: Number,
      required: [true, 'Panno is required'],
      min: [0, 'Panno must be zero or greater'],
    },
    wastagePercent: {
      type: Number,
      required: [true, 'Wastage percent is required'],
      min: [0, 'Wastage percent cannot be negative'],
      max: [100, 'Wastage percent cannot exceed 100'],
    },
    recommendedRpm: {
      type: Number,
      min: [1, 'Recommended RPM must be at least 1'],
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
    // Preserve legacy fields like widthInches or pano on raw MongoDB docs without throwing
    strict: false,
  },
);

// ─── Pre-validate: sync normalized fields & backward compatibility fallback ───
fabricSchema.pre('validate', function (next) {
  if (this.name) {
    this.normalizedName = normalizeFabricName(this.name);
  }
  if (this.code) {
    this.normalizedCode = normalizeFabricCode(this.code);
  }
  // If panno is missing but legacy pano exists on document, bridge it safely
  const raw = this as unknown as Record<string, unknown>;
  if (this.panno === undefined && typeof raw['pano'] === 'number') {
    this.panno = raw['pano'] as number;
  }
  next();
});

// ─── Unique Compound Indexes ──────────────────────────────────────────────────
// Code must be unique within a factory
fabricSchema.index(
  { factoryId: 1, normalizedCode: 1 },
  { unique: true, name: 'uniq_factory_fabric_code' },
);

// Name uniqueness within factory
fabricSchema.index(
  { factoryId: 1, normalizedName: 1 },
  { unique: true, name: 'uniq_factory_fabric_name' },
);

// ─── Performance Indexes ──────────────────────────────────────────────────────
fabricSchema.index({ factoryId: 1, isActive: 1 });
fabricSchema.index({ factoryId: 1, createdAt: -1 });
fabricSchema.index({ factoryId: 1, warpYarnId: 1 });
fabricSchema.index({ factoryId: 1, weftYarnId: 1 });

export const Fabric = model<IFabric>('Fabric', fabricSchema);
