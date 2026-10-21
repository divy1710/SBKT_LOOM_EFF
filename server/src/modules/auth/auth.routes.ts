import { Router } from 'express';
import {
  login,
  logout,
  me,
  register,
  bootstrap,
  loginRateLimiter,
  registerRateLimiter,
  bootstrapRateLimiter,
} from './auth.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.model';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Rate-limited. Public.
 */
router.post('/login', loginRateLimiter, login);

/**
 * POST /api/v1/auth/logout
 * Authenticated or not — always clears the cookie.
 */
router.post('/logout', logout);

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile.
 */
router.get('/me', authenticate, me);

/**
 * POST /api/v1/auth/register
 * Admin-only: creates a new user account (OPERATOR role by default).
 * Full role assignment is done via PATCH /users/:id.
 */
router.post(
  '/register',
  registerRateLimiter,
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  register,
);

/**
 * POST /api/v1/auth/bootstrap
 * One-time endpoint to create the first SUPER_ADMIN.
 * Returns 404 when BOOTSTRAP_ENABLED=false.
 */
router.post('/bootstrap', bootstrapRateLimiter, bootstrap);

export default router;
