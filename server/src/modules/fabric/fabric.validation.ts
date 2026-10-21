import { z } from 'zod';

// ─── Reusable ObjectId helper ─────────────────────────────────────────────────
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

// ─── Create Fabric ─────────────────────────────────────────────────────────────
export const createFabricSchema = z.object({
  name: z
    .string({ required_error: 'Fabric name is required' })
    .trim()
    .min(1, 'Fabric name cannot be empty')
    .max(120, 'Fabric name cannot exceed 120 characters'),

  code: z
    .string({ required_error: 'Fabric code is required' })
    .trim()
    .min(1, 'Fabric code cannot be empty')
    .max(40, 'Fabric code cannot exceed 40 characters'),

  warpYarnId: objectIdSchema.describe('Warp yarn ID is required'),

  weftYarnId: objectIdSchema.describe('Weft yarn ID is required'),

  ppi: z
    .number({ required_error: 'PPI is required', invalid_type_error: 'PPI must be a number' })
    .int('PPI must be a whole number')
    .min(1, 'PPI must be at least 1'),

  panno: z
    .number({
      required_error: 'Panno is required',
      invalid_type_error: 'Panno must be a number',
    })
    .min(0, 'Panno must be zero or greater'),

  wastagePercent: z
    .number({
      required_error: 'Wastage percent is required',
      invalid_type_error: 'Wastage percent must be a number',
    })
    .min(0, 'Wastage percent cannot be negative')
    .max(100, 'Wastage percent cannot exceed 100'),

  recommendedRpm: z
    .number({ invalid_type_error: 'Recommended RPM must be a number' })
    .int('Recommended RPM must be a whole number')
    .min(1, 'Recommended RPM must be at least 1')
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),

  // SUPER_ADMIN may specify a factoryId; FACTORY_ADMIN always uses their own
  factoryId: objectIdSchema.optional(),
});

// ─── Update Fabric ─────────────────────────────────────────────────────────────
export const updateFabricSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Fabric name cannot be empty')
      .max(120, 'Fabric name cannot exceed 120 characters')
      .optional(),

    code: z
      .string()
      .trim()
      .min(1, 'Fabric code cannot be empty')
      .max(40, 'Fabric code cannot exceed 40 characters')
      .optional(),

    warpYarnId: objectIdSchema.optional(),

    weftYarnId: objectIdSchema.optional(),

    ppi: z
      .number({ invalid_type_error: 'PPI must be a number' })
      .int('PPI must be a whole number')
      .min(1, 'PPI must be at least 1')
      .optional(),

    panno: z
      .number({ invalid_type_error: 'Panno must be a number' })
      .min(0, 'Panno must be zero or greater')
      .optional(),

    wastagePercent: z
      .number({ invalid_type_error: 'Wastage percent must be a number' })
      .min(0, 'Wastage percent cannot be negative')
      .max(100, 'Wastage percent cannot exceed 100')
      .optional(),

    recommendedRpm: z
      .number({ invalid_type_error: 'Recommended RPM must be a number' })
      .int('Recommended RPM must be a whole number')
      .min(1, 'Recommended RPM must be at least 1')
      .optional(),

    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// ─── Status Update ─────────────────────────────────────────────────────────────
export const updateFabricStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});

// ─── List / Query ─────────────────────────────────────────────────────────────
export const queryFabricSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  isActive: z
    .union([z.enum(['true', 'false', 'all']), z.boolean()])
    .optional(),
  sortBy: z
    .enum(['name', 'code', 'ppi', 'panno', 'createdAt', 'updatedAt'])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  factoryId: objectIdSchema.optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreateFabricInput = z.infer<typeof createFabricSchema>;
export type UpdateFabricInput = z.infer<typeof updateFabricSchema>;
export type UpdateFabricStatusInput = z.infer<typeof updateFabricStatusSchema>;
export type QueryFabricInput = z.infer<typeof queryFabricSchema>;
