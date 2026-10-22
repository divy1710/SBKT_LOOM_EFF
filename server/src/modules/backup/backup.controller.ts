import { Request, Response, NextFunction } from 'express';
import { backupService } from './backup.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { UserRole } from '../user/user.model';
import { Factory } from '../factory/factory.model';

export class BackupController {
  /**
   * Helper to resolve target factory ID based on user authorization
   */
  private async resolveTargetFactoryId(req: Request): Promise<string> {
    const user = req.user;
    if (!user) throw ApiError.unauthorized('Authentication required.');

    // FACTORY_ADMIN can only operate on their own factory
    if (user.role === UserRole.FACTORY_ADMIN) {
      if (!user.factoryId) {
        throw ApiError.forbidden('Factory Admin must be assigned to a factory.');
      }
      return user.factoryId.toString();
    }

    // SUPER_ADMIN can specify factoryId via query/body or fallback to user factory or first factory
    if (user.role === UserRole.SUPER_ADMIN) {
      const explicitId =
        (req.query.factoryId as string) ||
        (req.body.factoryId as string) ||
        user.factoryId?.toString();
      if (explicitId) return explicitId;

      const first = await Factory.findOne().sort({ createdAt: 1 });
      if (!first) throw ApiError.notFound('No factory found.');
      return first._id.toString();
    }

    throw ApiError.forbidden('Insufficient permissions to manage backups.');
  }

  /**
   * GET /api/v1/backup/export
   * Creates and downloads full company backup archive
   */
  async exportBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const factoryId = await this.resolveTargetFactoryId(req);
      const { buffer, filename, manifest } = await backupService.createFullBackup(
        factoryId,
        req.user!.role,
      );

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('X-SBKT-Backup-Format', manifest.backupFormat);
      res.setHeader('X-SBKT-Total-Records', manifest.totalRecords.toString());

      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/backup/validate
   * Validates archive integrity, schema, and checksums without modifying data
   */
  async validateBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file || !req.file.buffer) {
        throw ApiError.badRequest('No backup archive file provided.');
      }

      const factoryId = await this.resolveTargetFactoryId(req);
      const result = await backupService.validateBackupArchive(req.file.buffer, factoryId);

      res.status(200).json(
        new ApiResponse(
          result.valid
            ? 'Backup archive validation passed'
            : 'Backup archive validation failed',
          result,
        ).toJSON(),
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/backup/restore/replace
   * Mode A: Full Replace Restore
   */
  async restoreFullReplace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file || !req.file.buffer) {
        throw ApiError.badRequest('No backup archive file provided.');
      }

      const confirmationPhrase = req.body.confirmationPhrase;
      if (confirmationPhrase !== 'RESTORE COMPANY DATA') {
        throw ApiError.badRequest(
          'Confirmation phrase must exactly match "RESTORE COMPANY DATA".',
        );
      }

      const factoryId = await this.resolveTargetFactoryId(req);
      const summary = await backupService.restoreFullReplace(
        req.file.buffer,
        factoryId,
        req.user!.id,
        confirmationPhrase,
      );

      res.status(200).json(
        new ApiResponse('Full Replace Restore completed successfully', summary).toJSON(),
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/backup/restore/merge
   * Mode B: Merge Import
   */
  async restoreMerge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file || !req.file.buffer) {
        throw ApiError.badRequest('No backup archive file provided.');
      }

      const factoryId = await this.resolveTargetFactoryId(req);
      const summary = await backupService.restoreMerge(
        req.file.buffer,
        factoryId,
        req.user!.id,
      );

      res.status(200).json(
        new ApiResponse('Merge Import completed successfully', summary).toJSON(),
      );
    } catch (err) {
      next(err);
    }
  }
}

export const backupController = new BackupController();
