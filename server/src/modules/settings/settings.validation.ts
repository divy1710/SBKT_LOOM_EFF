import { z } from 'zod';

// ─── Factory Profile Schema ───────────────────────────────────────────────────
export const updateFactoryProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Factory name must be at least 2 characters')
    .max(100, 'Factory name must not exceed 100 characters')
    .optional(),
  address: z
    .string()
    .trim()
    .max(250, 'Address must not exceed 250 characters')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{7,15}$/, 'Invalid phone number format (7-15 digits)')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  logo: z
    .string()
    .max(1024 * 1024, 'Logo data exceeds maximum size limit (1MB)') // 1MB max for Base64 or URL
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type UpdateFactoryProfileInput = z.infer<typeof updateFactoryProfileSchema>;

// ─── Production Preferences Schema ───────────────────────────────────────────
export const updateProductionPreferencesSchema = z.object({
  dayShiftDurationHours: z
    .number()
    .min(1, 'Day shift duration must be at least 1 hour')
    .max(24, 'Day shift duration cannot exceed 24 hours'),
  nightShiftDurationHours: z
    .number()
    .min(1, 'Night shift duration must be at least 1 hour')
    .max(24, 'Night shift duration cannot exceed 24 hours'),
  dayShiftStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Day shift start time must be in HH:mm format (e.g., 08:00)'),
  nightShiftStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Night shift start time must be in HH:mm format (e.g., 19:00)'),
  defaultEfficiencyMode: z.enum(['AUTO', 'CUSTOM']),
  lowBeamMeterAlertThreshold: z
    .number()
    .min(0, 'Alert threshold must be non-negative')
    .max(10000, 'Alert threshold cannot exceed 10,000 meters'),
}).refine(
  (data) => data.dayShiftDurationHours + data.nightShiftDurationHours <= 24,
  {
    message: 'Combined day and night shift durations cannot exceed 24 hours in a single operating day',
    path: ['nightShiftDurationHours'],
  }
);

export type UpdateProductionPreferencesInput = z.infer<typeof updateProductionPreferencesSchema>;

// ─── User Profile Schema ──────────────────────────────────────────────────────
export const updateUserProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

// ─── User Preferences Schema ──────────────────────────────────────────────────
export const updateUserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.enum(['en', 'gu', 'hi']).optional(),
});

export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;

// ─── Change Password Schema ───────────────────────────────────────────────────
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
