import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../auth/permissions';
import { factoryController } from './factory.controller';
import { factoryAdminController } from './factory-admin.controller';

const router = Router();

router.use(authenticate);

// ─── Factory CRUD ─────────────────────────────────────────────────────────────
router.get('/', requirePermission('factory.read'), (req, res, next) =>
  factoryController.listFactories(req, res, next),
);
router.post('/', requirePermission('factory.create'), (req, res, next) =>
  factoryController.createFactory(req, res, next),
);
router.get('/:id', requirePermission('factory.read'), (req, res, next) =>
  factoryController.getFactoryDetails(req, res, next),
);
router.patch('/:id', requirePermission('factory.update'), (req, res, next) =>
  factoryController.updateFactory(req, res, next),
);
router.patch('/:id/status', requirePermission('factory.deactivate'), (req, res, next) =>
  factoryController.setFactoryStatus(req, res, next),
);

// ─── Factory Admin Management ─────────────────────────────────────────────────
router.get('/admins/all', requirePermission('factory.admin.manage'), (req, res, next) =>
  factoryAdminController.listFactoryAdmins(req, res, next),
);
router.post('/admins', requirePermission('factory.admin.manage'), (req, res, next) =>
  factoryAdminController.createFactoryAdmin(req, res, next),
);
router.patch('/admins/:id/assign', requirePermission('factory.admin.manage'), (req, res, next) =>
  factoryAdminController.assignFactoryAdmin(req, res, next),
);
router.patch('/admins/:id/status', requirePermission('factory.admin.manage'), (req, res, next) =>
  factoryAdminController.setFactoryAdminStatus(req, res, next),
);

export default router;
