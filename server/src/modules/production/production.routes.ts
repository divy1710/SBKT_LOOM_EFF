import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { UserRole } from '../user/user.model';
import {
  getByDateAndShift,
  getSheetById,
  saveSheet,
  completeSheet,
  reopenSheet,
  listSheets,
} from './production.controller';
import {
  saveProductionSheetSchema,
  queryProductionSheetSchema,
  getByDateQuerySchema,
} from './production.validation';

const router = Router();

// ── All production routes require authentication ──────────────────────────────
router.use(authenticate);

// ── Read endpoints ────────────────────────────────────────────────────────────
router.get('/', validate(queryProductionSheetSchema, 'query'), listSheets);

// ── By-Date Lookup (Registered BEFORE /:id to prevent route shadowing) ─────────
router.get('/by-date', validate(getByDateQuerySchema, 'query'), getByDateAndShift);

// ── Detail Read ───────────────────────────────────────────────────────────────
router.get('/:id', getSheetById);

// ── Save / Create / Update Sheet (Draft or Completed) ─────────────────────────
router.post(
  '/',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  validate(saveProductionSheetSchema, 'body'),
  saveSheet,
);

// ── Complete & Lock Sheet ─────────────────────────────────────────────────────
router.post(
  '/:id/complete',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER, UserRole.OPERATOR),
  completeSheet,
);

// ── Reopen Completed Sheet (Managers & Admins only) ───────────────────────────
router.post(
  '/:id/reopen',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  reopenSheet,
);

export default router;
