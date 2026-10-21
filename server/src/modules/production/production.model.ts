import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────
export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
}

export enum ProductionSheetStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
}

export enum EfficiencyMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum ProductionMachineStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  MAINTENANCE = 'MAINTENANCE',
}

// ─── Production Entry Interface (Embedded Subdocument) ────────────────────────
export interface IProductionEntry {
  _id: Types.ObjectId;
  machineId: Types.ObjectId;
  machineNumberSnapshot: string;
  machineNameSnapshot?: string;
  fabricId?: Types.ObjectId;
  fabricNameSnapshot: string;
  fabricCodeSnapshot?: string;
  shift: ShiftType;
  productionDate: Date;
  actualProductionMeters: number;
  efficiencyMode: EfficiencyMode;
  efficiencyPercent: number | null;
  rpmSnapshot: number;
  ppiSnapshot: number;
  shiftDurationHours: number;
  theoreticalProductionMeters: number | null;
  machineStatusSnapshot: ProductionMachineStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Production Sheet Interface ───────────────────────────────────────────────
export interface IProductionSheet extends Document {
  _id: Types.ObjectId;
  factoryId: Types.ObjectId;
  productionDate: Date; // Normalized to UTC midnight
  shift: ShiftType;
  shiftStart: Date;
  shiftEnd: Date;
  shiftDurationHours: number;
  entries: Types.DocumentArray<IProductionEntry>;
  totalProductionMeters: number;
  runningMachineCount: number;
  stoppedMachineCount: number;
  maintenanceMachineCount: number;
  averageEfficiency: number | null;
  notes?: string;
  status: ProductionSheetStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Safe DTOs ────────────────────────────────────────────────────────────────
export interface SafeProductionEntry {
  id: string;
  machineId: string;
  machineNumberSnapshot: string;
  machineNameSnapshot?: string;
  fabricId?: string;
  fabricNameSnapshot: string;
  fabricCodeSnapshot?: string;
  shift: ShiftType;
  productionDate: string; // 'YYYY-MM-DD'
  actualProductionMeters: number;
  efficiencyMode: EfficiencyMode;
  efficiencyPercent: number | null;
  rpmSnapshot: number;
  ppiSnapshot: number;
  shiftDurationHours: number;
  theoreticalProductionMeters: number | null;
  machineStatusSnapshot: ProductionMachineStatus;
  notes?: string;
}

export interface SafeProductionSheet {
  id: string;
  factoryId: string;
  productionDate: string; // 'YYYY-MM-DD'
  shift: ShiftType;
  shiftStart: string; // ISO
  shiftEnd: string; // ISO
  shiftDurationHours: number;
  entries: SafeProductionEntry[];
  totalProductionMeters: number;
  runningMachineCount: number;
  stoppedMachineCount: number;
  maintenanceMachineCount: number;
  averageEfficiency: number | null;
  notes?: string;
  status: ProductionSheetStatus;
  createdBy: string;
  updatedBy: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function toSafeProductionEntry(entry: IProductionEntry): SafeProductionEntry {
  const d = entry.productionDate;
  const dateFormatted = d ? d.toISOString().split('T')[0] : '';
  return {
    id: entry._id.toString(),
    machineId: entry.machineId.toString(),
    machineNumberSnapshot: entry.machineNumberSnapshot,
    machineNameSnapshot: entry.machineNameSnapshot,
    fabricId: entry.fabricId ? entry.fabricId.toString() : undefined,
    fabricNameSnapshot: entry.fabricNameSnapshot,
    fabricCodeSnapshot: entry.fabricCodeSnapshot,
    shift: entry.shift,
    productionDate: dateFormatted,
    actualProductionMeters: entry.actualProductionMeters,
    efficiencyMode: entry.efficiencyMode,
    efficiencyPercent: entry.efficiencyPercent,
    rpmSnapshot: entry.rpmSnapshot,
    ppiSnapshot: entry.ppiSnapshot,
    shiftDurationHours: entry.shiftDurationHours,
    theoreticalProductionMeters: entry.theoreticalProductionMeters,
    machineStatusSnapshot: entry.machineStatusSnapshot,
    notes: entry.notes,
  };
}

export function toSafeProductionSheet(sheet: IProductionSheet): SafeProductionSheet {
  const d = sheet.productionDate;
  const dateFormatted = d ? d.toISOString().split('T')[0] : '';

  return {
    id: sheet._id.toString(),
    factoryId: sheet.factoryId.toString(),
    productionDate: dateFormatted,
    shift: sheet.shift,
    shiftStart: sheet.shiftStart.toISOString(),
    shiftEnd: sheet.shiftEnd.toISOString(),
    shiftDurationHours: sheet.shiftDurationHours,
    entries: sheet.entries.map((e) => toSafeProductionEntry(e)),
    totalProductionMeters: sheet.totalProductionMeters,
    runningMachineCount: sheet.runningMachineCount,
    stoppedMachineCount: sheet.stoppedMachineCount,
    maintenanceMachineCount: sheet.maintenanceMachineCount,
    averageEfficiency: sheet.averageEfficiency,
    notes: sheet.notes,
    status: sheet.status,
    createdBy: sheet.createdBy ? sheet.createdBy.toString() : '',
    updatedBy: sheet.updatedBy ? sheet.updatedBy.toString() : '',
    completedAt: sheet.completedAt ? sheet.completedAt.toISOString() : undefined,
    completedBy: sheet.completedBy ? sheet.completedBy.toString() : undefined,
    createdAt: sheet.createdAt.toISOString(),
    updatedAt: sheet.updatedAt.toISOString(),
  };
}

// ─── Entry Schema ─────────────────────────────────────────────────────────────
const productionEntrySchema = new Schema<IProductionEntry>(
  {
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
      required: [true, 'Machine ID is required'],
    },
    machineNumberSnapshot: {
      type: String,
      required: [true, 'Machine number snapshot is required'],
      trim: true,
      uppercase: true,
    },
    machineNameSnapshot: {
      type: String,
      trim: true,
    },
    fabricId: {
      type: Schema.Types.ObjectId,
      ref: 'Fabric',
    },
    fabricNameSnapshot: {
      type: String,
      required: [true, 'Fabric name snapshot is required'],
      trim: true,
    },
    fabricCodeSnapshot: {
      type: String,
      trim: true,
      uppercase: true,
    },
    shift: {
      type: String,
      enum: Object.values(ShiftType),
      required: [true, 'Shift is required'],
    },
    productionDate: {
      type: Date,
      required: [true, 'Production date is required'],
    },
    actualProductionMeters: {
      type: Number,
      required: [true, 'Actual production meters is required'],
      min: [0, 'Actual production meters cannot be negative'],
    },
    efficiencyMode: {
      type: String,
      enum: Object.values(EfficiencyMode),
      default: EfficiencyMode.AUTO,
    },
    efficiencyPercent: {
      type: Number,
      min: [0, 'Efficiency cannot be negative'],
      default: null,
    },
    rpmSnapshot: {
      type: Number,
      required: [true, 'RPM snapshot is required'],
      min: [1, 'RPM must be positive'],
    },
    ppiSnapshot: {
      type: Number,
      required: [true, 'PPI snapshot is required'],
      min: [1, 'PPI must be positive'],
    },
    shiftDurationHours: {
      type: Number,
      required: true,
    },
    theoreticalProductionMeters: {
      type: Number,
      default: null,
    },
    machineStatusSnapshot: {
      type: String,
      enum: Object.values(ProductionMachineStatus),
      default: ProductionMachineStatus.RUNNING,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Sheet Schema ─────────────────────────────────────────────────────────────
const productionSheetSchema = new Schema<IProductionSheet>(
  {
    factoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Factory',
      required: [true, 'Factory ID is required'],
      index: true,
    },
    productionDate: {
      type: Date,
      required: [true, 'Production date is required'],
      index: true,
    },
    shift: {
      type: String,
      enum: Object.values(ShiftType),
      required: [true, 'Shift is required'],
      index: true,
    },
    shiftStart: {
      type: Date,
      required: [true, 'Shift start timestamp is required'],
    },
    shiftEnd: {
      type: Date,
      required: [true, 'Shift end timestamp is required'],
    },
    shiftDurationHours: {
      type: Number,
      required: [true, 'Shift duration hours is required'],
    },
    entries: [productionEntrySchema],
    totalProductionMeters: {
      type: Number,
      default: 0,
      min: 0,
    },
    runningMachineCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stoppedMachineCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maintenanceMachineCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageEfficiency: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ProductionSheetStatus),
      default: ProductionSheetStatus.DRAFT,
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
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// ─── Compound Unique Index ────────────────────────────────────────────────────
// Guarantee that only one production sheet exists per factory, date, and shift
productionSheetSchema.index(
  { factoryId: 1, productionDate: 1, shift: 1 },
  { unique: true, name: 'uniq_factory_date_shift' },
);

productionSheetSchema.index(
  { factoryId: 1, 'entries.machineId': 1, productionDate: 1 },
  { name: 'idx_factory_entry_machine_date' },
);

productionSheetSchema.index(
  { factoryId: 1, 'entries.fabricId': 1, productionDate: 1 },
  { name: 'idx_factory_entry_fabric_date' },
);

export const ProductionSheet = model<IProductionSheet>('ProductionSheet', productionSheetSchema);
