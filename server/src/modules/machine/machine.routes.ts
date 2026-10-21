import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { UserRole } from '../user/user.model';
import {
  createMachine,
  listMachines,
  getMachine,
  updateMachine,
  updateMachineStatus,
  toggleMachineActive,
  batchUpdateMachines,
  loadBeam,
  unloadBeam,
} from './machine.controller';
import {
  createMachineSchema,
  updateMachineSchema,
  updateMachineStatusSchema,
  batchUpdateMachineSchema,
  machineQuerySchema,
  machineLoadBeamSchema,
  machineUnloadBeamSchema,
} from './machine.validation';

const router = Router();

// ── All Machine endpoints require authentication ──────────────────────────────
router.use(authenticate);

// ── Read endpoints ────────────────────────────────────────────────────────────
router.get('/', validate(machineQuerySchema, 'query'), listMachines);

// ── Batch Edit (Registered before /:id to prevent route shadowing) ────────────
router.patch(
  '/batch',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  validate(batchUpdateMachineSchema, 'body'),
  batchUpdateMachines,
);

router.post(
  '/batch',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  validate(batchUpdateMachineSchema, 'body'),
  batchUpdateMachines,
);

// ── Detail Read ───────────────────────────────────────────────────────────────
router.get('/:id', getMachine);

// ── Creation (SUPER_ADMIN, FACTORY_ADMIN, MANAGER) ────────────────────────────
router.post(
  '/',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  validate(createMachineSchema, 'body'),
  createMachine,
);

// ── Mutation Endpoints ────────────────────────────────────────────────────────
router.patch(
  '/:id',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER),
  validate(updateMachineSchema, 'body'),
  updateMachine,
);

router.patch(
  '/:id/status',
  authorize(
    UserRole.SUPER_ADMIN,
    UserRole.FACTORY_ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
  ),
  validate(updateMachineStatusSchema, 'body'),
  updateMachineStatus,
);

router.patch(
  '/:id/active',
  authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN),
  toggleMachineActive,
);

// ── Beam Loading & Unloading on Machine ───────────────────────────────────────
router.post(
  '/:id/load-beam',
  authorize(
    UserRole.SUPER_ADMIN,
    UserRole.FACTORY_ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
  ),
  validate(machineLoadBeamSchema, 'body'),
  loadBeam,
);

router.post(
  '/:id/unload-beam',
  authorize(
    UserRole.SUPER_ADMIN,
    UserRole.FACTORY_ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
  ),
  validate(machineUnloadBeamSchema, 'body'),
  unloadBeam,
);

export default router;
