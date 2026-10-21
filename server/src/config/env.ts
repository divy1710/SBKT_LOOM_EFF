import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Environment Schema ──────────────────────────────────────────────────────
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // ── JWT ──────────────────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),

  // ── Cookie ───────────────────────────────────────────────────────────────
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),

  // ── Bootstrap (disabled by default) ──────────────────────────────────────
  BOOTSTRAP_ENABLED: z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .default('false'),
  BOOTSTRAP_SECRET: z
    .string()
    .min(32, 'BOOTSTRAP_SECRET must be at least 32 characters if BOOTSTRAP_ENABLED=true')
    .optional(),
});

// ─── Parse & Validate ────────────────────────────────────────────────────────
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌  Invalid or missing environment variables:');
  _parsed.error.issues.forEach((issue) => {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('\n👉  Copy server/.env.example to server/.env and fill in the required values.\n');
  process.exit(1);
}

export const env = _parsed.data;

// ─── Runtime guard: bootstrap secret required when bootstrap is enabled ───────
if (env.BOOTSTRAP_ENABLED && !env.BOOTSTRAP_SECRET) {
  console.error('❌  BOOTSTRAP_ENABLED=true but BOOTSTRAP_SECRET is not set or is too short.');
  console.error('   Set BOOTSTRAP_SECRET to a random string of at least 32 characters.');
  process.exit(1);
}

// ─── Derived helpers ─────────────────────────────────────────────────────────
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
