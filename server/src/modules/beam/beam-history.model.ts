import { Schema, model, Document, Types } from 'mongoose';
import { BeamStatus } from './beam.model';

export interface IBeamLoadingHistory extends Document {
  _id: Types.ObjectId;
  factoryId: Types.ObjectId;
  beamId: Types.ObjectId;
  machineId?: Types.ObjectId;
  machineNumber?: string;
  loadedAt: Date;
  unloadedAt?: Date;
  startingMeters: number;
  endingMeters?: number;
  usedMeters?: number;
  status: BeamStatus; // Outcome status (LOADED, IN_GODOWN, FINISHED, SHORTAGE)
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeBeamHistory {
  id: string;
  factoryId: string;
  beamId: string;
  machineId?: string;
  machineNumber?: string;
  loadedAt: Date;
  unloadedAt?: Date;
  startingMeters: number;
  endingMeters?: number;
  usedMeters?: number;
  status: BeamStatus;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export function toSafeBeamHistory(history: IBeamLoadingHistory): SafeBeamHistory {
  const used =
    history.endingMeters !== undefined
      ? Math.max(0, history.startingMeters - history.endingMeters)
      : undefined;

  return {
    id: history._id.toString(),
    factoryId: history.factoryId.toString(),
    beamId: history.beamId.toString(),
    machineId: history.machineId ? history.machineId.toString() : undefined,
    machineNumber: history.machineNumber,
    loadedAt: history.loadedAt,
    unloadedAt: history.unloadedAt,
    startingMeters: history.startingMeters,
    endingMeters: history.endingMeters,
    usedMeters: used,
    status: history.status,
    notes: history.notes,
    createdBy: history.createdBy.toString(),
    createdAt: history.createdAt,
  };
}

const beamLoadingHistorySchema = new Schema<IBeamLoadingHistory>(
  {
    factoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Factory',
      required: true,
    },
    beamId: {
      type: Schema.Types.ObjectId,
      ref: 'Beam',
      required: true,
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
    },
    machineNumber: {
      type: String,
      trim: true,
      maxlength: [40, 'Machine number cannot exceed 40 characters'],
    },
    loadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    unloadedAt: {
      type: Date,
    },
    startingMeters: {
      type: Number,
      required: true,
      min: [0, 'Starting meters cannot be negative'],
    },
    endingMeters: {
      type: Number,
      min: [0, 'Ending meters cannot be negative'],
    },
    usedMeters: {
      type: Number,
      min: [0, 'Used meters cannot be negative'],
    },
    status: {
      type: String,
      enum: Object.values(BeamStatus),
      required: true,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      trim: true,
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
  },
);

beamLoadingHistorySchema.index({ factoryId: 1, beamId: 1, createdAt: -1 });
beamLoadingHistorySchema.index({ factoryId: 1, machineNumber: 1 });

export const BeamLoadingHistory = model<IBeamLoadingHistory>(
  'BeamLoadingHistory',
  beamLoadingHistorySchema,
);
