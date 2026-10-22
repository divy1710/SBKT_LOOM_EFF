import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.model';
import { settingsController } from './settings.controller';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// ─── Factory Profile ──────────────────────────────────────────────────────────
router.get('/factory', (req, res, next) => settingsController.getFactory(req, res, next));
router.patch(
  '/factory',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  (req, res, next) => settingsController.updateFactory(req, res, next),
);

// ─── Production Preferences ───────────────────────────────────────────────────
router.get('/production', (req, res, next) => settingsController.getProductionPreferences(req, res, next));
router.patch(
  '/production',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  (req, res, next) => settingsController.updateProductionPreferences(req, res, next),
);

// ─── Account Settings ─────────────────────────────────────────────────────────
router.patch('/account/profile', (req, res, next) => settingsController.updateProfile(req, res, next));
router.patch('/account/preferences', (req, res, next) => settingsController.updatePreferences(req, res, next));
router.post('/account/change-password', (req, res, next) => settingsController.changePassword(req, res, next));
router.patch('/account/change-password', (req, res, next) => settingsController.changePassword(req, res, next));

// ─── System Information / Diagnostics ─────────────────────────────────────────
router.get('/system', (req, res, next) => settingsController.getSystemDiagnostics(req, res, next));

export default router;
