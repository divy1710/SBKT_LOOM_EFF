import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UserRole, USER_MANAGEMENT_ROLES } from '../user/user.model';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  changeUserStatus,
} from './user.controller';

const router = Router();

// All user management routes require authentication
router.use(authenticate);
router.use(authorize(...USER_MANAGEMENT_ROLES));

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN), createUser);
router.patch('/:id', updateUser);
router.patch('/:id/status', changeUserStatus);

export default router;
