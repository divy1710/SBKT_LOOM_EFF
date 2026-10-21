import { z } from 'zod';
import { Types } from 'mongoose';
import { MachineStatus } from './machine.model';
import { BeamStatus } from '../beam/beam.model';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => Types.ObjectId.isValid(val) && objectIdRegex.test(val), {
    message: 'Invalid ObjectId format',
  });

// ─── Create Machine Schema ───────────────────────────────────────────────────
export const createMachineSchema = z.object({
  machineNumber: z
    .string({ required_error: 'Machine number is required' })
    .trim()
    .min(1, 'Machine number cannot be empty')
    .max(50, 'Machine number cannot exceed 50 characters'),
  name: z
    .string({ required_error: 'Machine name is required' })
    .trim()
    .min(1, 'Machine name cannot be empty')
    .max(100, 'Machine name cannot exceed 100 characters'),
  fabricId: objectIdSchema,
  rpm: z
    .number({ required_error: 'RPM is required' })
    .positive('RPM must be greater than zero')
    .max(5000, 'RPM cannot exceed 5000'),
  ppi: z
    .number({ required_error: 'PPI is required' })
    .positive('PPI must be greater than zero')
    .max(500, 'PPI cannot exceed 500'),
  status: z
    .nativeEnum(MachineStatus, {
      errorMap: () => ({ message: 'Status must be RUNNING, STOPPED, or MAINTENANCE' }),
    })
    .optional()
    .default(MachineStatus.STOPPED),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional(),
});

export type CreateMachineInput = z.infer<typeof createMachineSchema>;

// ─── Update Machine Schema ───────────────────────────────────────────────────
export const updateMachineSchema = z
  .object({
    machineNumber: z
      .string()
      .trim()
      .min(1, 'Machine number cannot be empty')
      .max(50, 'Machine number cannot exceed 50 characters')
      .optional(),
    name: z
      .string()
      .trim()
      .min(1, 'Machine name cannot be empty')
      .max(100, 'Machine name cannot exceed 100 characters')
      .optional(),
    fabricId: objectIdSchema.optional(),
    rpm: z
      .number()
      .positive('RPM must be greater than zero')
      .max(5000, 'RPM cannot exceed 5000')
      .optional(),
    ppi: z
      .number()
      .positive('PPI must be greater than zero')
      .max(500, 'PPI cannot exceed 500')
      .optional(),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional(),
  })
  .strict();

export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;

// ─── Update Machine Status Schema ────────────────────────────────────────────
export const updateMachineStatusSchema = z
  .object({
    status: z.nativeEnum(MachineStatus, {
      errorMap: () => ({ message: 'Status must be RUNNING, STOPPED, or MAINTENANCE' }),
    }),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional(),
  })
  .strict();

export type UpdateMachineStatusInput = z.infer<typeof updateMachineStatusSchema>;

// ─── Batch Update Machine Schema ─────────────────────────────────────────────
export const batchUpdateMachineSchema = z
  .object({
    machineIds: z
      .array(objectIdSchema, { required_error: 'machineIds array is required' })
      .min(1, 'At least one machine must be selected'),
    updates: z
      .object({
        fabricId: objectIdSchema.optional(),
        rpm: z
          .number()
          .positive('RPM must be greater than zero')
          .max(5000, 'RPM cannot exceed 5000')
          .optional(),
        ppi: z
          .number()
          .positive('PPI must be greater than zero')
          .max(500, 'PPI cannot exceed 500')
          .optional(),
        notes: z
          .string()
          .trim()
          .max(1000, 'Notes cannot exceed 1000 characters')
          .optional(),
      })
      .refine(
        (data) =>
          data.fabricId !== undefined ||
          data.rpm !== undefined ||
          data.ppi !== undefined ||
          data.notes !== undefined,
        {
          message: 'At least one field to update must be provided in updates',
        },
      ),
  })
  .strict();

export type BatchUpdateMachineInput = z.infer<typeof batchUpdateMachineSchema>;

// ─── Load Beam onto Machine Schema ───────────────────────────────────────────
export const machineLoadBeamSchema = z
  .object({
    beamId: objectIdSchema,
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional(),
  })
  .strict();

export type MachineLoadBeamInput = z.infer<typeof machineLoadBeamSchema>;

// ─── Unload Beam from Machine Schema ─────────────────────────────────────────
export const machineUnloadBeamSchema = z
  .object({
    endingMeters: z
      .number()
      .min(0, 'Ending meters cannot be negative')
      .optional(),
    outcomeStatus: z
      .nativeEnum(BeamStatus, {
        errorMap: () => ({
          message: 'Outcome status must be IN_GODOWN, FINISHED, or SHORTAGE',
        }),
      })
      .refine((val) => val !== BeamStatus.LOADED, {
        message: 'Outcome status cannot be LOADED when unloading a beam',
      })
      .optional()
      .default(BeamStatus.IN_GODOWN),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional(),
  })
  .strict();

export type MachineUnloadBeamInput = z.infer<typeof machineUnloadBeamSchema>;

// ─── Query Schema ────────────────────────────────────────────────────────────
export const machineQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  status: z.nativeEnum(MachineStatus).optional(),
  fabricId: objectIdSchema.optional(),
  isActive: z
    .union([z.enum(['true', 'false', 'all']), z.boolean()])
    .optional(),
  sortBy: z
    .enum(['machineNumber', 'name', 'rpm', 'ppi', 'status', 'createdAt', 'updatedAt'])
    .default('machineNumber'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type MachineQueryParams = z.infer<typeof machineQuerySchema>;
