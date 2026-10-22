import { z } from 'zod';

export const createFactorySchema = z.object({
  name: z
    .string({ required_error: 'Factory name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  code: z
    .string({ required_error: 'Factory code is required' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{2,20}$/, 'Code must be 2-20 uppercase letters, numbers, hyphens, or underscores'),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().default('India'),
  phone: z.string().trim().optional(),
  email: z.string().email('Invalid email address').toLowerCase().trim().optional().or(z.literal('')),
  logo: z.string().optional().nullable(),
  timezone: z.string().trim().default('Asia/Kolkata'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateFactorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().email('Invalid email address').toLowerCase().trim().optional().or(z.literal('')),
  logo: z.string().optional().nullable(),
  timezone: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const factoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).default('ALL'),
});
