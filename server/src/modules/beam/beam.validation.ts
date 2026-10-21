import { z } from 'zod';
import { BeamStatus } from './beam.model';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

// ─── Create Beam ─────────────────────────────────────────────────────────────
export const createBeamSchema = z
  .object({
    beamNumber: z
      .string({ required_error: 'Beam number is required' })
      .trim()
      .min(1, 'Beam number cannot be empty')
      .max(40, 'Beam number cannot exceed 40 characters'),

    pipeNumber: z
      .string()
      .trim()
      .max(40, 'Pipe number cannot exceed 40 characters')
      .optional(),

    fabricId: objectIdSchema.describe('Fabric quality reference is required'),

    warpYarnId: objectIdSchema.describe('Warp yarn reference is required'),

    originalLengthMeters: z
      .number({
        required_error: 'Original length is required',
        invalid_type_error: 'Original length must be a number',
      })
      .positive('Original length must be greater than zero'),

    remainingLengthMeters: z
      .number({ invalid_type_error: 'Remaining length must be a number' })
      .min(0, 'Remaining length cannot be negative')
      .optional(),

    ends: z
      .number({
        required_error: 'Ends count is required',
        invalid_type_error: 'Ends must be a number',
      })
      .int('Ends count must be a whole number')
      .min(1, 'Ends count must be at least 1'),

    widthInches: z
      .number({ invalid_type_error: 'Beam width must be a number' })
      .positive('Beam width must be greater than zero')
      .optional(),

    alertAtMeters: z
      .number({ invalid_type_error: 'Alert threshold must be a number' })
      .min(0, 'Alert threshold must be zero or greater')
      .default(500)
      .optional(),

    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters')
      .optional(),

    factoryId: objectIdSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.remainingLengthMeters !== undefined) {
        return data.remainingLengthMeters <= data.originalLengthMeters;
      }
      return true;
    },
    {
      message: 'Remaining length cannot exceed original length',
      path: ['remainingLengthMeters'],
    },
  );

// ─── Update Beam ─────────────────────────────────────────────────────────────
export const updateBeamSchema = z
  .object({
    beamNumber: z
      .string()
      .trim()
      .min(1, 'Beam number cannot be empty')
      .max(40, 'Beam number cannot exceed 40 characters')
      .optional(),

    pipeNumber: z
      .string()
      .trim()
      .max(40, 'Pipe number cannot exceed 40 characters')
      .optional(),

    fabricId: objectIdSchema.optional(),

    warpYarnId: objectIdSchema.optional(),

    originalLengthMeters: z
      .number({ invalid_type_error: 'Original length must be a number' })
      .positive('Original length must be greater than zero')
      .optional(),

    remainingLengthMeters: z
      .number({ invalid_type_error: 'Remaining length must be a number' })
      .min(0, 'Remaining length cannot be negative')
      .optional(),

    ends: z
      .number({ invalid_type_error: 'Ends must be a number' })
      .int('Ends count must be a whole number')
      .min(1, 'Ends count must be at least 1')
      .optional(),

    widthInches: z
      .number({ invalid_type_error: 'Beam width must be a number' })
      .positive('Beam width must be greater than zero')
      .optional(),

    alertAtMeters: z
      .number({ invalid_type_error: 'Alert threshold must be a number' })
      .min(0, 'Alert threshold must be zero or greater')
      .optional(),

    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// ─── Status Update ─────────────────────────────────────────────────────────────
export const updateBeamStatusSchema = z.object({
  status: z.nativeEnum(BeamStatus, {
    errorMap: () => ({ message: 'Status must be IN_GODOWN, LOADED, FINISHED, or SHORTAGE' }),
  }),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional(),
});

// ─── Load Beam ────────────────────────────────────────────────────────────────
export const loadBeamSchema = z.object({
  machineNumber: z
    .string()
    .trim()
    .max(40, 'Machine number cannot exceed 40 characters')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional(),
});

// ─── Unload Beam ──────────────────────────────────────────────────────────────
export const unloadBeamSchema = z.object({
  outcomeStatus: z
    .enum([BeamStatus.IN_GODOWN, BeamStatus.FINISHED, BeamStatus.SHORTAGE], {
      errorMap: () => ({
        message: 'Outcome status must be IN_GODOWN, FINISHED, or SHORTAGE',
      }),
    })
    .default(BeamStatus.IN_GODOWN),
  endingMeters: z
    .number({ invalid_type_error: 'Ending meters must be a number' })
    .min(0, 'Ending meters cannot be negative')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional(),
});

// ─── Query Beams ──────────────────────────────────────────────────────────────
export const queryBeamSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.nativeEnum(BeamStatus).optional(),
  fabricId: objectIdSchema.optional(),
  warpYarnId: objectIdSchema.optional(),
  isActive: z
    .union([z.enum(['true', 'false', 'all']), z.boolean()])
    .optional(),
  lowMeters: z
    .union([z.enum(['true', 'false']), z.boolean()])
    .optional(),
  sortBy: z
    .enum([
      'beamNumber',
      'originalLengthMeters',
      'remainingLengthMeters',
      'ends',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  factoryId: objectIdSchema.optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreateBeamInput = z.infer<typeof createBeamSchema>;
export type UpdateBeamInput = z.infer<typeof updateBeamSchema>;
export type UpdateBeamStatusInput = z.infer<typeof updateBeamStatusSchema>;
export type LoadBeamInput = z.infer<typeof loadBeamSchema>;
export type UnloadBeamInput = z.infer<typeof unloadBeamSchema>;
export type QueryBeamInput = z.infer<typeof queryBeamSchema>;
