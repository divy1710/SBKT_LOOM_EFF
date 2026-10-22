import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { UserRole } from '../user/user.model';

export class AuditController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let factoryId = req.query.factoryId as string | undefined;

      // Factory admins can only query their own factory's audit logs
      if (user.role === UserRole.FACTORY_ADMIN) {
        factoryId = user.factoryId?.toString();
      }

      const result = await auditService.listLogs({
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        factoryId,
        action: req.query.action as string | undefined,
        actorId: req.query.actorId as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        search: req.query.search as string | undefined,
      });

      res.status(200).json(new ApiResponse('Audit logs retrieved successfully', result).toJSON());
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
