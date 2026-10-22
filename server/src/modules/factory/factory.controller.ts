import { Request, Response, NextFunction } from 'express';
import { factoryService } from './factory.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import {
  createFactorySchema,
  updateFactorySchema,
  factoryListQuerySchema,
} from './factory.validation';

export class FactoryController {
  async listFactories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = factoryListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const result = await factoryService.listFactories(parsed.data);
      res.status(200).json(new ApiResponse('Factories retrieved successfully', result).toJSON());
    } catch (err) {
      next(err);
    }
  }

  async createFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createFactorySchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const factory = await factoryService.createFactory(parsed.data, req.user!);
      res.status(201).json(new ApiResponse('Factory created successfully', factory).toJSON());
    } catch (err) {
      next(err);
    }
  }

  async getFactoryDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const details = await factoryService.getFactoryDetails(id);
      res.status(200).json(new ApiResponse('Factory details retrieved', details).toJSON());
    } catch (err) {
      next(err);
    }
  }

  async updateFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const parsed = updateFactorySchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const updated = await factoryService.updateFactory(id, parsed.data, req.user!);
      res.status(200).json(new ApiResponse('Factory updated successfully', updated).toJSON());
    } catch (err) {
      next(err);
    }
  }

  async setFactoryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const status = req.body.status;
      if (status !== 'ACTIVE' && status !== 'INACTIVE') {
        return next(ApiError.badRequest('Status must be either ACTIVE or INACTIVE.'));
      }

      const updated = await factoryService.setFactoryStatus(id, status, req.user!);
      res.status(200).json(new ApiResponse(`Factory status updated to ${status}`, updated).toJSON());
    } catch (err) {
      next(err);
    }
  }
}

export const factoryController = new FactoryController();
