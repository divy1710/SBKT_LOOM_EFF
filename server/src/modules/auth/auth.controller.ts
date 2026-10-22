import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual } from 'crypto';

import { User, UserRole, toSafeUser } from '../user/user.model';
import { Factory } from '../factory/factory.model';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { signAccessToken, COOKIE_NAME, getTokenMaxAgeMs } from '../../utils/jwt';
import { env, isProduction } from '../../config/env';
import {
  loginSchema,
  bootstrapSchema,
  registerSchema,
} from './auth.schemas';

const BCRYPT_ROUNDS = 12;

// ─── Cookie options ────────────────────────────────────────────────────────────
const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: getTokenMaxAgeMs(),
  path: '/',
});

// ─── Rate limiters ────────────────────────────────────────────────────────────
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.', timestamp: new Date().toISOString() },
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration requests. Try again later.', timestamp: new Date().toISOString() },
});

export const bootstrapRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many bootstrap attempts.', timestamp: new Date().toISOString() },
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(ApiError.badRequest('Invalid email or password'));
    }
    const { email, password } = parsed.data;

    // Load user WITH passwordHash (select: false by default)
    const user = await User.findOne({ email }).select('+passwordHash').exec();

    // Use a constant-time path to prevent timing-based account enumeration
    const dummyHash = '$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.';
    const hashToCompare = user ? user.passwordHash : dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch) {
      // Generic message — does not reveal whether email exists
      return next(new ApiError(401, 'Invalid email or password'));
    }

    if (!user.isActive) {
      return next(new ApiError(401, 'Invalid email or password'));
    }

    // Update lastLoginAt without triggering full model validation
    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    let factoryName: string | undefined;
    let factoryTimezone: string | undefined;
    if (user.factoryId) {
      const factory = await Factory.findById(user.factoryId).select('name timezone').lean();
      if (factory) {
        factoryName = factory.name;
        factoryTimezone = factory.timezone || 'Asia/Kolkata';
      }
    }

    const token = signAccessToken(user._id, user.role, user.factoryId);
    res.cookie(COOKIE_NAME, token, cookieOptions());

    res
      .status(200)
      .json(
        new ApiResponse('Login successful', {
          token,
          user: {
            ...toSafeUser(user),
            ...(factoryName ? { factoryName, factoryTimezone } : {}),
          },
        }).toJSON(),
      );
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    path: '/',
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  });
  res.status(200).json(new ApiResponse('Logged out successfully').toJSON());
};

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    let factoryName: string | undefined;
    let factoryTimezone: string | undefined;
    if (user.factoryId) {
      const factory = await Factory.findById(user.factoryId).select('name timezone').lean();
      if (factory) {
        factoryName = factory.name;
        factoryTimezone = factory.timezone || 'Asia/Kolkata';
      }
    }

    res.status(200).json(
      new ApiResponse('Profile retrieved', {
        user: {
          ...toSafeUser(user),
          ...(factoryName ? { factoryName, factoryTimezone } : {}),
        },
      }).toJSON(),
    );
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────
// Restricted: only FACTORY_ADMIN or SUPER_ADMIN can create users via this endpoint.
// Public self-registration is NOT allowed.
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i: { message: string }) => i.message).join('; ');
      return next(ApiError.badRequest(messages));
    }
    const { name, email, password, factoryId } = parsed.data;

    const actor = req.user!;

    // Determine the role for the new user — regular users get OPERATOR by default
    // Only admins can set it; role assignment is handled by POST /users
    const newRole = UserRole.OPERATOR;

    // Factory validation
    let resolvedFactoryId = factoryId;
    if (actor.role === UserRole.FACTORY_ADMIN) {
      // Factory admins can only create users in their own factory
      resolvedFactoryId = actor.factoryId?.toString();
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return next(new ApiError(409, 'An account with this email already exists'));
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: newRole,
      factoryId: resolvedFactoryId,
      isActive: true,
    });

    res.status(201).json(
      new ApiResponse('User created successfully', {
        user: toSafeUser(newUser),
      }).toJSON(),
    );
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/auth/bootstrap ─────────────────────────────────────────────
/**
 * One-time bootstrap to create the initial SUPER_ADMIN and first factory.
 *
 * Requirements:
 * - BOOTSTRAP_ENABLED must be true in .env
 * - x-bootstrap-secret header must match BOOTSTRAP_SECRET (timing-safe compare)
 * - No SUPER_ADMIN must already exist (one-time only)
 */
export const bootstrap = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!env.BOOTSTRAP_ENABLED) {
      return next(new ApiError(404, 'Not found'));
    }

    // Timing-safe secret comparison
    const providedSecret = (req.headers['x-bootstrap-secret'] as string | undefined) ?? '';
    const expectedSecret = env.BOOTSTRAP_SECRET ?? '';

    let secretMatch = false;
    if (providedSecret.length > 0 && expectedSecret.length > 0) {
      try {
        const a = Buffer.from(providedSecret.padEnd(128));
        const b = Buffer.from(expectedSecret.padEnd(128));
        secretMatch = timingSafeEqual(a, b) && providedSecret === expectedSecret;
      } catch {
        secretMatch = false;
      }
    }

    if (!secretMatch) {
      return next(new ApiError(403, 'Invalid bootstrap secret'));
    }

    const parsed = bootstrapSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i: { message: string }) => i.message).join('; ');
      return next(ApiError.badRequest(messages));
    }
    const { factoryName, factoryCode, adminName, adminEmail, adminPassword } = parsed.data;

    // Check that no SUPER_ADMIN already exists (atomic check)
    const existingAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN }).exec();
    if (existingAdmin) {
      return next(
        new ApiError(409, 'Bootstrap has already been completed. Disable BOOTSTRAP_ENABLED.'),
      );
    }

    // Check email uniqueness
    const emailTaken = await User.findOne({ email: adminEmail }).exec();
    if (emailTaken) {
      return next(new ApiError(409, 'Email is already in use'));
    }

    // Create factory first
    let factory = await Factory.findOne({ code: factoryCode }).exec();
    if (!factory) {
      factory = await Factory.create({
        name: factoryName,
        code: factoryCode,
        timezone: 'Asia/Kolkata',
        isActive: true,
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

    // Create SUPER_ADMIN
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      factoryId: factory._id,
      isActive: true,
    });

    // Log completion (no secrets)
    console.log(`🔐  Bootstrap complete. SUPER_ADMIN created: ${adminEmail}`);
    console.log('⚠️   Set BOOTSTRAP_ENABLED=false in server/.env immediately.');

    res.status(201).json(
      new ApiResponse('Bootstrap complete. Set BOOTSTRAP_ENABLED=false now.', {
        user: toSafeUser(adminUser),
        factory: { id: factory._id, name: factory.name, code: factory.code },
      }).toJSON(),
    );
  } catch (err) {
    next(err);
  }
};
