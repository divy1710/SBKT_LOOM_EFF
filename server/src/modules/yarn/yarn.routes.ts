import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { UserRole } from '../user/user.model';
import {
  createYarn,
  listYarns,
  getYarn,
  updateYarn,
  changeYarnStatus,
} from './yarn.controller';
import {
  createYarnSchema,
  updateYarnSchema,
  updateYarnStatusSchema,
  queryYarnSchema,
} from './yarn.validation';

const router = Router();

// ── All Yarn endpoints require authentication ─────────────────────────────────
router.use(authenticate);

// ── Read endpoints (accessible to all authenticated roles within factory rules)
router.get('/', validate(queryYarnSchema, 'query'), listYarns);
router.get('/:id', getYarn);

// ── Mutation endpoints (restricted to SUPER_ADMIN and FACTORY_ADMIN) ───────────
router.post(
  '/',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  validate(createYarnSchema, 'body'),
  createYarn,
);

router.patch(
  '/:id',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  validate(updateYarnSchema, 'body'),
  updateYarn,
);

router.patch(
  '/:id/status',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  validate(updateYarnStatusSchema, 'body'),
  changeYarnStatus,
);

export default router;
