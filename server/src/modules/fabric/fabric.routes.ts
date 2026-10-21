import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { UserRole } from '../user/user.model';
import {
  createFabric,
  listFabrics,
  getFabric,
  updateFabric,
  changeFabricStatus,
} from './fabric.controller';
import {
  createFabricSchema,
  updateFabricSchema,
  updateFabricStatusSchema,
  queryFabricSchema,
} from './fabric.validation';

const router = Router();

// ── All Fabric endpoints require authentication ────────────────────────────────
router.use(authenticate);

// ── Read endpoints ─────────────────────────────────────────────────────────────
router.get('/', validate(queryFabricSchema, 'query'), listFabrics);
router.get('/:id', getFabric);

// ── Mutation endpoints (SUPER_ADMIN and FACTORY_ADMIN only) ───────────────────
router.post(
  '/',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  validate(createFabricSchema, 'body'),
  createFabric,
);

router.patch(
  '/:id',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  validate(updateFabricSchema, 'body'),
  updateFabric,
);

router.patch(
  '/:id/status',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  validate(updateFabricStatusSchema, 'body'),
  changeFabricStatus,
);

export default router;
