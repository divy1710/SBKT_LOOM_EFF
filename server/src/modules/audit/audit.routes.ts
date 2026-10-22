import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../auth/permissions';
import { auditController } from './audit.controller';

const router = Router();

router.use(authenticate);
router.use(requirePermission('audit.read'));

router.get('/', (req, res, next) => auditController.getAuditLogs(req, res, next));

export default router;
