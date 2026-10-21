import { Schema, model, Document, Types } from 'mongoose';

// ─── Machine Operational Status Enum ──────────────────────────────────────────
export enum MachineStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  MAINTENANCE = 'MAINTENANCE',
}

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IMachine extends Document {
  _id: Types.ObjectId;
  machineNumber: string;
  normalizedMachineNumber: string; // Uppercase, trimmed for duplicate prevention
  name: string;
  factoryId: Types.ObjectId;
  fabricId: Types.ObjectId;
  loadedBeamId?: Types.ObjectId;
  rpm: number;
  ppi: number;
  status: MachineStatus;
  notes?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Populated Reference Interfaces ──────────────────────────────────────────
export interface PopulatedMachineFabric {
  _id: Types.ObjectId;
  name: string;
  code: string;
  ppi: number;
  panno: number;
  recommendedRpm?: number;
}

export interface PopulatedMachineBeam {
  _id: Types.ObjectId;
  beamNumber: string;
  originalLengthMeters: number;
  remainingLengthMeters: number;
  status: string;
}

// ─── Safe DTO ─────────────────────────────────────────────────────────────────
export interface SafeMachine {
  id: string;
  machineNumber: string;
  name: string;
  factoryId: string;
  fabricId: string;
  fabric?: {
    id: string;
    name: string;
    code: string;
    ppi: number;
    panno: number;
    recommendedRpm?: number;
  };
  loadedBeamId?: string;
  loadedBeam?: {
    id: string;
    beamNumber: string;
    originalLengthMeters: number;
    remainingLengthMeters: number;
    status: string;
  };
  rpm: number;
  ppi: number;
  status: MachineStatus;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeMachine(machine: IMachine): SafeMachine {
  const isPopulatedFabric =
    machine.fabricId &&
    typeof machine.fabricId === 'object' &&
    'name' in machine.fabricId;

  const fabricObj = isPopulatedFabric
    ? (machine.fabricId as unknown as PopulatedMachineFabric)
    : undefined;

  const isPopulatedBeam =
    machine.loadedBeamId &&
    typeof machine.loadedBeamId === 'object' &&
    'beamNumber' in machine.loadedBeamId;

  const loadedBeamObj = isPopulatedBeam
    ? (machine.loadedBeamId as unknown as PopulatedMachineBeam)
    : undefined;

  const resolvedFabricId = fabricObj
    ? fabricObj._id.toString()
    : machine.fabricId
      ? machine.fabricId.toString()
      : '';

  const resolvedLoadedBeamId = loadedBeamObj
    ? loadedBeamObj._id.toString()
    : machine.loadedBeamId
      ? machine.loadedBeamId.toString()
      : undefined;

  return {
    id: machine._id.toString(),
    machineNumber: machine.machineNumber,
    name: machine.name,
    factoryId: machine.factoryId.toString(),
    fabricId: resolvedFabricId,
    fabric: fabricObj
      ? {
          id: fabricObj._id.toString(),
          name: fabricObj.name,
          code: fabricObj.code,
          ppi: fabricObj.ppi,
          panno: fabricObj.panno,
          recommendedRpm: fabricObj.recommendedRpm,
        }
      : undefined,
    loadedBeamId: resolvedLoadedBeamId,
    loadedBeam: loadedBeamObj
      ? {
          id: loadedBeamObj._id.toString(),
          beamNumber: loadedBeamObj.beamNumber,
          originalLengthMeters: loadedBeamObj.originalLengthMeters,
          remainingLengthMeters: loadedBeamObj.remainingLengthMeters,
          status: loadedBeamObj.status,
        }
      : undefined,
    rpm: machine.rpm,
    ppi: machine.ppi,
    status: machine.status,
    notes: machine.notes,
    isActive: machine.isActive,
    createdBy: machine.createdBy.toString(),
    updatedBy: machine.updatedBy.toString(),
    createdAt: machine.createdAt,
    updatedAt: machine.updatedAt,
  };
}

// ─── Normalizer ───────────────────────────────────────────────────────────────
export function normalizeMachineNumber(machineNumber: string): string {
  return machineNumber.trim().toUpperCase();
}

// ─── Mongoose Schema ──────────────────────────────────────────────────────────
const MachineSchema = new Schema<IMachine>(
  {
    machineNumber: {
      type: String,
      required: [true, 'Machine number is required'],
      trim: true,
      maxlength: [50, 'Machine number cannot exceed 50 characters'],
    },
    normalizedMachineNumber: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Machine name is required'],
      trim: true,
      maxlength: [100, 'Machine name cannot exceed 100 characters'],
    },
    factoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Factory',
      required: [true, 'Factory reference is required'],
      index: true,
    },
    fabricId: {
      type: Schema.Types.ObjectId,
      ref: 'Fabric',
      required: [true, 'Fabric reference is required'],
      index: true,
    },
    loadedBeamId: {
      type: Schema.Types.ObjectId,
      ref: 'Beam',
      default: undefined,
      index: true,
    },
    rpm: {
      type: Number,
      required: [true, 'RPM is required'],
      min: [1, 'RPM must be greater than zero'],
    },
    ppi: {
      type: Number,
      required: [true, 'PPI is required'],
      min: [1, 'PPI must be greater than zero'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(MachineStatus),
        message: 'Invalid machine status: {VALUE}',
      },
      default: MachineStatus.STOPPED,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'machines',
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Enforce unique machine number per factory
MachineSchema.index({ factoryId: 1, normalizedMachineNumber: 1 }, { unique: true });
MachineSchema.index({ factoryId: 1, status: 1 });
MachineSchema.index({ factoryId: 1, fabricId: 1 });
MachineSchema.index({ factoryId: 1, isActive: 1 });
MachineSchema.index({ factoryId: 1, loadedBeamId: 1 });

// Pre-validate hook
MachineSchema.pre('validate', function (next) {
  if (this.machineNumber) {
    this.normalizedMachineNumber = normalizeMachineNumber(this.machineNumber);
  }
  next();
});

export const Machine = model<IMachine>('Machine', MachineSchema);
