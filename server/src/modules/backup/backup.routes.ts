import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.model';
import { backupController } from './backup.controller';

const router = Router();

// Configure memory storage for uploaded ZIP archives (max 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    // Check if filename ends with .zip or mime-type is zip
    if (
      file.originalname.toLowerCase().endsWith('.zip') ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only valid .zip backup files are accepted.'));
    }
  },
});

// All backup routes require authentication and SUPER_ADMIN or FACTORY_ADMIN role
router.use(authenticate);
router.use(authorize(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN));

// 1. Export & Download Backup
router.get('/export', (req, res, next) => backupController.exportBackup(req, res, next));

// 2. Validate Archive & Metadata Preview (non-destructive)
router.post('/validate', upload.single('file'), (req, res, next) =>
  backupController.validateBackup(req, res, next),
);

// 3. Mode A: Full Replace Restore
router.post('/restore/replace', upload.single('file'), (req, res, next) =>
  backupController.restoreFullReplace(req, res, next),
);

// 4. Mode B: Merge Import
router.post('/restore/merge', upload.single('file'), (req, res, next) =>
  backupController.restoreMerge(req, res, next),
);

export default router;
