import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

// ─── Register (admin-created or invited users only) ───────────────────────────
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters'),
  factoryId: z.string().optional(),
});

// ─── Create user (admin panel, role can be specified by authorized caller) ────
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(12).max(128),
  role: z.string(),          // validated against allowed roles in the controller
  factoryId: z.string().optional(),
});

// ─── Update user ──────────────────────────────────────────────────────────────
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  factoryId: z.string().optional(),
});

// ─── Status change ────────────────────────────────────────────────────────────
export const statusChangeSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' }),
});

// ─── User list query ──────────────────────────────────────────────────────────
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.string().optional(),
  isActive: z
    .string()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined))
    .optional(),
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
export const bootstrapSchema = z.object({
  factoryName: z.string().trim().min(2).max(100),
  factoryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{2,20}$/, 'Code must be 2-20 uppercase letters, numbers, hyphens, or underscores'),
  adminName: z.string().trim().min(2).max(100),
  adminEmail: z.string().email().toLowerCase().trim(),
  adminPassword: z.string().min(12).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type BootstrapInput = z.infer<typeof bootstrapSchema>;
