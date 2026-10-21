import { z } from 'zod';
import { ShiftType, ProductionSheetStatus, EfficiencyMode } from './production.model';

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ─── Production Entry Input ───────────────────────────────────────────────────
export const saveProductionEntrySchema = z.object({
  machineId: z
    .string({ required_error: 'Machine ID is required' })
    .regex(MONGO_ID_REGEX, 'Invalid machine ID format'),
  actualProductionMeters: z
    .number({ required_error: 'Actual production meters is required' })
    .min(0, 'Actual production meters cannot be negative')
    .max(100000, 'Actual production meters seems unreasonably high'),
  efficiencyMode: z
    .nativeEnum(EfficiencyMode, {
      invalid_type_error: 'Efficiency mode must be AUTO or MANUAL',
    })
    .default(EfficiencyMode.AUTO),
  efficiencyPercent: z
    .number()
    .min(0, 'Efficiency percent cannot be negative')
    .max(500, 'Efficiency percent cannot exceed 500%')
    .nullable()
    .optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

// ─── Save / Create Production Sheet ───────────────────────────────────────────
export const saveProductionSheetSchema = z.object({
  productionDate: z
    .string({ required_error: 'Production date is required' })
    .regex(DATE_REGEX, 'Production date must be in YYYY-MM-DD format'),
  shift: z.nativeEnum(ShiftType, {
    required_error: 'Shift is required',
    invalid_type_error: 'Shift must be DAY or NIGHT',
  }),
  entries: z
    .array(saveProductionEntrySchema)
    .min(1, 'Production sheet must contain at least one machine entry'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  status: z
    .nativeEnum(ProductionSheetStatus, {
      invalid_type_error: 'Status must be DRAFT or COMPLETED',
    })
    .optional()
    .default(ProductionSheetStatus.DRAFT),
});

// ─── Update Production Sheet ───────────────────────────────────────────────────
export const updateProductionSheetSchema = z.object({
  entries: z
    .array(saveProductionEntrySchema)
    .min(1, 'Production sheet must contain at least one machine entry')
    .optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  status: z
    .nativeEnum(ProductionSheetStatus, {
      invalid_type_error: 'Status must be DRAFT or COMPLETED',
    })
    .optional(),
});

// ─── Query Production Sheet ───────────────────────────────────────────────────
export const queryProductionSheetSchema = z.object({
  date: z.string().regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format').optional(),
  shift: z.nativeEnum(ShiftType).optional(),
  status: z.nativeEnum(ProductionSheetStatus).optional(),
  startDate: z.string().regex(DATE_REGEX, 'startDate must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(DATE_REGEX, 'endDate must be in YYYY-MM-DD format').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['productionDate', 'createdAt', 'totalProductionMeters']).default('productionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  factoryId: z.string().regex(MONGO_ID_REGEX).optional(),
});

export const getByDateQuerySchema = z.object({
  date: z
    .string({ required_error: 'date query parameter is required' })
    .regex(DATE_REGEX, 'date must be in YYYY-MM-DD format'),
  shift: z.nativeEnum(ShiftType, {
    required_error: 'shift query parameter is required',
  }),
  factoryId: z.string().regex(MONGO_ID_REGEX).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type SaveProductionEntryInput = z.infer<typeof saveProductionEntrySchema>;
export type SaveProductionSheetInput = z.infer<typeof saveProductionSheetSchema>;
export type UpdateProductionSheetInput = z.infer<typeof updateProductionSheetSchema>;
export type QueryProductionSheetInput = z.infer<typeof queryProductionSheetSchema>;
export type GetByDateQueryInput = z.infer<typeof getByDateQuerySchema>;
