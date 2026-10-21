import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { UserRole } from '../user/user.model';
import {
  createBeam,
  listBeams,
  getBeam,
  updateBeam,
  updateBeamStatus,
  loadBeam,
  unloadBeam,
  getBeamHistory,
  toggleBeamActive,
} from './beam.controller';
import {
  createBeamSchema,
  updateBeamSchema,
  updateBeamStatusSchema,
  loadBeamSchema,
  unloadBeamSchema,
  queryBeamSchema,
} from './beam.validation';

const router = Router();

// ── All Beam endpoints require authentication ─────────────────────────────────
router.use(authenticate);

// ── Read endpoints ────────────────────────────────────────────────────────────
router.get('/', validate(queryBeamSchema, 'query'), listBeams);
router.get('/:id', getBeam);
router.get('/:id/history', getBeamHistory);

// ── Mutation endpoints (SUPER_ADMIN, FACTORY_ADMIN, MANAGER) ──────────────────
router.post(
  '/',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  validate(createBeamSchema, 'body'),
  createBeam,
);

router.patch(
  '/:id',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  validate(updateBeamSchema, 'body'),
  updateBeam,
);

router.patch(
  '/:id/status',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  validate(updateBeamStatusSchema, 'body'),
  updateBeamStatus,
);

router.patch(
  '/:id/active',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  toggleBeamActive,
);

// ── Load & Unload (also permitted for OPERATOR floor operations) ───────────────
router.post(
  '/:id/load',
  authorize(
    UserRole.SUPER_ADMIN,
    UserRole.FACTORY_ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
  ),
  validate(loadBeamSchema, 'body'),
  loadBeam,
);

router.post(
  '/:id/unload',
  authorize(
    UserRole.SUPER_ADMIN,
    UserRole.FACTORY_ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
  ),
  validate(unloadBeamSchema, 'body'),
  unloadBeam,
);

export default router;
