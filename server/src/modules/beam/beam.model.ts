import { Schema, model, Document, Types } from 'mongoose';

// ─── Status Enum ──────────────────────────────────────────────────────────────
export enum BeamStatus {
  IN_GODOWN = 'IN_GODOWN',
  LOADED = 'LOADED',
  FINISHED = 'FINISHED',
  SHORTAGE = 'SHORTAGE',
}

// ─── Beam Interface ───────────────────────────────────────────────────────────
export interface IBeam extends Document {
  _id: Types.ObjectId;
  beamNumber: string;
  normalizedBeamNumber: string;
  pipeNumber?: string;
  factoryId: Types.ObjectId;
  fabricId: Types.ObjectId;
  warpYarnId: Types.ObjectId;
  originalLengthMeters: number;
  remainingLengthMeters: number;
  ends: number;
  widthInches?: number;
  status: BeamStatus;
  loadedMachineId?: Types.ObjectId;
  loadedMachineNumber?: string;
  loadedAt?: Date;
  unloadedAt?: Date;
  alertAtMeters: number;
  notes?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Populated Reference Interfaces ──────────────────────────────────────────
export interface PopulatedFabric {
  _id: Types.ObjectId;
  name: string;
  code: string;
  ppi: number;
  panno: number;
}

export interface PopulatedYarn {
  _id: Types.ObjectId;
  name: string;
  denier: number;
  yarnType: string;
}

// ─── Safe Beam DTO ────────────────────────────────────────────────────────────
export interface SafeBeam {
  id: string;
  beamNumber: string;
  pipeNumber?: string;
  factoryId: string;
  fabricId: string;
  fabric?: {
    id: string;
    name: string;
    code: string;
    ppi: number;
    panno: number;
  };
  warpYarnId: string;
  warpYarn?: {
    id: string;
    name: string;
    denier: number;
    yarnType: string;
  };
  originalLengthMeters: number;
  remainingLengthMeters: number;
  usedLengthMeters: number;
  isLowMeters: boolean;
  ends: number;
  widthInches?: number;
  status: BeamStatus;
  loadedMachineId?: string;
  loadedMachineNumber?: string;
  loadedAt?: Date;
  unloadedAt?: Date;
  alertAtMeters: number;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function normalizeBeamNumber(num: string): string {
  return num.trim().toUpperCase();
}

export function toSafeBeam(beam: IBeam): SafeBeam {
  const isPopulatedFabric =
    beam.fabricId && typeof (beam.fabricId as unknown as PopulatedFabric).name === 'string';
  const isPopulatedYarn =
    beam.warpYarnId && typeof (beam.warpYarnId as unknown as PopulatedYarn).name === 'string';

  const fabricObj = isPopulatedFabric
    ? (beam.fabricId as unknown as PopulatedFabric)
    : undefined;
  const yarnObj = isPopulatedYarn
    ? (beam.warpYarnId as unknown as PopulatedYarn)
    : undefined;

  const usedLength = Math.max(0, beam.originalLengthMeters - beam.remainingLengthMeters);
  const isLowMeters = beam.remainingLengthMeters <= (beam.alertAtMeters ?? 500);

  return {
    id: beam._id.toString(),
    beamNumber: beam.beamNumber,
    pipeNumber: beam.pipeNumber,
    factoryId: beam.factoryId.toString(),
    fabricId: fabricObj ? fabricObj._id.toString() : beam.fabricId.toString(),
    fabric: fabricObj
      ? {
          id: fabricObj._id.toString(),
          name: fabricObj.name,
          code: fabricObj.code,
          ppi: fabricObj.ppi,
          panno: fabricObj.panno,
        }
      : undefined,
    warpYarnId: yarnObj ? yarnObj._id.toString() : beam.warpYarnId.toString(),
    warpYarn: yarnObj
      ? {
          id: yarnObj._id.toString(),
          name: yarnObj.name,
          denier: yarnObj.denier,
          yarnType: yarnObj.yarnType,
        }
      : undefined,
    originalLengthMeters: beam.originalLengthMeters,
    remainingLengthMeters: beam.remainingLengthMeters,
    usedLengthMeters: usedLength,
    isLowMeters,
    ends: beam.ends,
    widthInches: beam.widthInches,
    status: beam.status,
    loadedMachineId: beam.loadedMachineId ? beam.loadedMachineId.toString() : undefined,
    loadedMachineNumber: beam.loadedMachineNumber,
    loadedAt: beam.loadedAt,
    unloadedAt: beam.unloadedAt,
    alertAtMeters: beam.alertAtMeters,
    notes: beam.notes,
    isActive: beam.isActive,
    createdBy: beam.createdBy.toString(),
    updatedBy: beam.updatedBy.toString(),
    createdAt: beam.createdAt,
    updatedAt: beam.updatedAt,
  };
}

// ─── Mongoose Schema ──────────────────────────────────────────────────────────
const beamSchema = new Schema<IBeam>(
  {
    beamNumber: {
      type: String,
      required: [true, 'Beam number is required'],
      trim: true,
      maxlength: [40, 'Beam number cannot exceed 40 characters'],
    },
    normalizedBeamNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    pipeNumber: {
      type: String,
      trim: true,
      maxlength: [40, 'Pipe number cannot exceed 40 characters'],
    },
    factoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Factory',
      required: [true, 'Factory ID is required'],
    },
    fabricId: {
      type: Schema.Types.ObjectId,
      ref: 'Fabric',
      required: [true, 'Fabric quality reference is required'],
    },
    warpYarnId: {
      type: Schema.Types.ObjectId,
      ref: 'Yarn',
      required: [true, 'Warp yarn reference is required'],
    },
    originalLengthMeters: {
      type: Number,
      required: [true, 'Original length is required'],
      min: [1, 'Original length must be greater than zero'],
    },
    remainingLengthMeters: {
      type: Number,
      required: [true, 'Remaining length is required'],
      min: [0, 'Remaining length cannot be negative'],
    },
    ends: {
      type: Number,
      required: [true, 'Ends count is required'],
      min: [1, 'Ends count must be greater than zero'],
    },
    widthInches: {
      type: Number,
      min: [0.1, 'Beam width must be greater than zero'],
    },
    status: {
      type: String,
      enum: Object.values(BeamStatus),
      default: BeamStatus.IN_GODOWN,
    },
    loadedMachineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
    },
    loadedMachineNumber: {
      type: String,
      trim: true,
      maxlength: [40, 'Machine number cannot exceed 40 characters'],
    },
    loadedAt: {
      type: Date,
    },
    unloadedAt: {
      type: Date,
    },
    alertAtMeters: {
      type: Number,
      default: 500,
      min: [0, 'Alert threshold must be zero or greater'],
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      trim: true,
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

// ─── Pre-validation Hooks ─────────────────────────────────────────────────────
beamSchema.pre('validate', function (next) {
  if (this.beamNumber) {
    this.normalizedBeamNumber = normalizeBeamNumber(this.beamNumber);
  }
  if (
    typeof this.originalLengthMeters === 'number' &&
    typeof this.remainingLengthMeters === 'number' &&
    this.remainingLengthMeters > this.originalLengthMeters
  ) {
    return next(new Error('Remaining length cannot exceed original length'));
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Unique beam number per factory
beamSchema.index(
  { factoryId: 1, normalizedBeamNumber: 1 },
  { unique: true, name: 'uniq_factory_beam_number' },
);

// Performance / filtering indexes
beamSchema.index({ factoryId: 1, isActive: 1 });
beamSchema.index({ factoryId: 1, status: 1 });
beamSchema.index({ factoryId: 1, fabricId: 1 });
beamSchema.index({ factoryId: 1, warpYarnId: 1 });
beamSchema.index({ factoryId: 1, remainingLengthMeters: 1 });
beamSchema.index({ factoryId: 1, createdAt: -1 });

export const Beam = model<IBeam>('Beam', beamSchema);
