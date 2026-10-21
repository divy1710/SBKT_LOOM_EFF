import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Types } from 'mongoose';
import { UserRole } from '../modules/user/user.model';

// ─── Token payload ────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;        // user._id as string
  role: UserRole;
  factoryId?: string;
  iat?: number;
  exp?: number;
}

// ─── Sign ─────────────────────────────────────────────────────────────────────
export function signAccessToken(
  userId: Types.ObjectId,
  role: UserRole,
  factoryId?: Types.ObjectId,
): string {
  const payload: JwtPayload = {
    sub: userId.toString(),
    role,
    factoryId: factoryId?.toString(),
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

// ─── Verify ──────────────────────────────────────────────────────────────────
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  }) as JwtPayload;
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────
export const COOKIE_NAME = 'sbkt_token';

// Parse the JWT_EXPIRES_IN string into milliseconds for cookie maxAge
export function getTokenMaxAgeMs(): number {
  const raw = env.JWT_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return 15 * 60 * 1000; // default 15 min
  const value = parseInt(match[1] ?? '15', 10);
  const unit = match[2];
  const mult: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (mult[unit ?? 'm'] ?? 60_000);
}
