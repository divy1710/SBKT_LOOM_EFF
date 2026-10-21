import { z } from 'zod';
import { YarnType, RateUnit } from './yarn.model';

export const createYarnSchema = z.object({
  name: z
    .string({ required_error: 'Yarn name is required' })
    .trim()
    .min(1, 'Yarn name cannot be empty')
    .max(100, 'Yarn name cannot exceed 100 characters'),
  denier: z
    .number({ required_error: 'Denier is required' })
    .positive('Denier must be greater than zero')
    .refine((val) => Number.isFinite(val), 'Denier must be a valid number'),
  yarnType: z.nativeEnum(YarnType, {
    errorMap: () => ({ message: 'Yarn type must be WARP, WEFT, or BOTH' }),
  }),
  rate: z
    .number({ required_error: 'Rate is required' })
    .min(0, 'Rate must be zero or greater')
    .refine((val) => Number.isFinite(val), 'Rate must be a valid number'),
  rateUnit: z
    .nativeEnum(RateUnit, {
      errorMap: () => ({ message: 'Rate unit must be KG, CONE, or OTHER' }),
    })
    .default(RateUnit.KG),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  factoryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid factory ID')
    .optional(),
});

export const updateYarnSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Yarn name cannot be empty')
      .max(100, 'Yarn name cannot exceed 100 characters')
      .optional(),
    denier: z
      .number()
      .positive('Denier must be greater than zero')
      .refine((val) => Number.isFinite(val), 'Denier must be a valid number')
      .optional(),
    yarnType: z
      .nativeEnum(YarnType, {
        errorMap: () => ({ message: 'Yarn type must be WARP, WEFT, or BOTH' }),
      })
      .optional(),
    rate: z
      .number()
      .min(0, 'Rate must be zero or greater')
      .refine((val) => Number.isFinite(val), 'Rate must be a valid number')
      .optional(),
    rateUnit: z
      .nativeEnum(RateUnit, {
        errorMap: () => ({ message: 'Rate unit must be KG, CONE, or OTHER' }),
      })
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

export const updateYarnStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});

export const queryYarnSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  yarnType: z.nativeEnum(YarnType).optional(),
  isActive: z
    .union([z.enum(['true', 'false', 'all']), z.boolean()])
    .optional(),
  sortBy: z
    .enum(['name', 'denier', 'rate', 'createdAt', 'updatedAt'])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  factoryId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid factory ID')
    .optional(),
});

export type CreateYarnInput = z.infer<typeof createYarnSchema>;
export type UpdateYarnInput = z.infer<typeof updateYarnSchema>;
export type UpdateYarnStatusInput = z.infer<typeof updateYarnStatusSchema>;
export type QueryYarnInput = z.infer<typeof queryYarnSchema>;
