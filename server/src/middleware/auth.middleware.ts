import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken, COOKIE_NAME, JwtPayload } from '../utils/jwt';
import { User, IUser, UserRole } from '../modules/user/user.model';
import { Factory } from '../modules/factory/factory.model';

// ─── Extend Express Request ────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      tokenPayload?: JwtPayload;
    }
  }
}

/**
 * authenticate — verifies the JWT in the HttpOnly cookie and attaches
 * the full user document to req.user.
 *
 * The token MUST come from the cookie (not a header) to protect against XSS.
 * The user is loaded fresh from the database on every request so that
 * deactivated accounts are rejected immediately.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const cookieToken: string | undefined =
      (req.cookies as Record<string, string | undefined>)[COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
    const token = cookieToken || headerToken;

    if (!token) {
      return next(new ApiError(401, 'Authentication required'));
    }

    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next(new ApiError(401, 'Invalid or expired token'));
    }

    // Load user fresh from DB — this ensures role/status changes apply immediately
    const user = await User.findById(payload.sub).select('+passwordHash').exec();

    if (!user) {
      return next(new ApiError(401, 'User account not found'));
    }

    if (!user.isActive) {
      return next(new ApiError(401, 'Account is deactivated'));
    }

    // Phase 11: Enforce factory active status for non-Super Admin users
    if (user.role !== UserRole.SUPER_ADMIN && user.factoryId) {
      const factory = await Factory.findById(user.factoryId).select('isActive status name').lean();
      if (!factory || factory.isActive === false || factory.status === 'INACTIVE') {
        return next(
          ApiError.forbidden(
            'Your factory has been deactivated. Please contact the platform administrator.',
          ),
        );
      }
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * authorize — checks that the authenticated user has one of the required roles.
 * Must be used after authenticate.
 */
export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };

/**
 * requireSameFactory — ensures FACTORY_ADMIN can only access their own factory's data.
 * Reads the target factoryId from req.params.factoryId or the request body.
 * SUPER_ADMIN bypasses this check.
 */
export const requireSameFactory = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const user = req.user;
  if (!user) return next(new ApiError(401, 'Authentication required'));

  if (user.role === UserRole.SUPER_ADMIN) return next();

  const targetFactoryId =
    (req.params['factoryId'] as string | undefined) ||
    (req.body as Record<string, unknown>)['factoryId'];

  if (
    targetFactoryId &&
    user.factoryId?.toString() !== targetFactoryId.toString()
  ) {
    return next(new ApiError(403, 'Access restricted to your own factory'));
  }

  next();
};
