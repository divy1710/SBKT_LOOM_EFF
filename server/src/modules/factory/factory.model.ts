import { Schema, model, Document, Types } from 'mongoose';

export interface IProductionPreferences {
  dayShiftDurationHours: number;
  nightShiftDurationHours: number;
  dayShiftStartTime: string;
  nightShiftStartTime: string;
  defaultEfficiencyMode: 'AUTO' | 'CUSTOM';
  lowBeamMeterAlertThreshold: number;
}

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IFactory extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  timezone: string;
  productionPreferences?: IProductionPreferences;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const factorySchema = new Schema<IFactory>(
  {
    name: {
      type: String,
      required: [true, 'Factory name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Factory code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]{2,20}$/, 'Code must be 2-20 uppercase letters, numbers, hyphens, or underscores'],
    },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    logo: { type: String },
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
    productionPreferences: {
      dayShiftDurationHours: { type: Number, default: 11, min: 1, max: 24 },
      nightShiftDurationHours: { type: Number, default: 13, min: 1, max: 24 },
      dayShiftStartTime: { type: String, default: '08:00' },
      nightShiftStartTime: { type: String, default: '19:00' },
      defaultEfficiencyMode: { type: String, enum: ['AUTO', 'CUSTOM'], default: 'AUTO' },
      lowBeamMeterAlertThreshold: { type: Number, default: 200, min: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
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

// ─── Additional indexes ───────────────────────────────────────────────────────
// Note: code index is already created by { unique: true } on the field itself.
factorySchema.index({ isActive: 1 });

export const Factory = model<IFactory>('Factory', factorySchema);
