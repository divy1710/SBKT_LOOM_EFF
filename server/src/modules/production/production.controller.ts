import { Request, Response, NextFunction } from 'express';
import { ProductionService } from './production.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { ShiftType } from './production.model';
import {
  SaveProductionSheetInput,
  QueryProductionSheetInput,
} from './production.validation';

export const getByDateAndShift = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const dateStr = req.query.date as string;
    const shift = req.query.shift as ShiftType;
    const explicitFactoryId = req.query.factoryId as string | undefined;

    const sheet = await ProductionService.getByDateAndShift(
      req.user,
      dateStr,
      shift,
      explicitFactoryId,
    );

    res.status(200).json(
      new ApiResponse(
        sheet ? 'Production sheet retrieved successfully' : 'No production sheet found for given date and shift',
        sheet,
      ),
    );
  } catch (err) {
    next(err);
  }
};

export const getSheetById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const explicitFactoryId = req.query.factoryId as string | undefined;

    const sheet = await ProductionService.getSheetById(id, req.user, explicitFactoryId);
    res.status(200).json(new ApiResponse('Production sheet retrieved successfully', sheet));
  } catch (err) {
    next(err);
  }
};

export const saveSheet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const input = req.body as SaveProductionSheetInput;
    const explicitFactoryId = req.query.factoryId as string | undefined;

    const sheet = await ProductionService.saveSheet(input, req.user, explicitFactoryId);
    res.status(200).json(new ApiResponse('Production sheet saved successfully', sheet));
  } catch (err) {
    next(err);
  }
};

export const completeSheet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const explicitFactoryId = req.query.factoryId as string | undefined;

    const sheet = await ProductionService.completeSheet(id, req.user, explicitFactoryId);
    res.status(200).json(new ApiResponse('Production sheet completed and locked successfully', sheet));
  } catch (err) {
    next(err);
  }
};

export const reopenSheet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const explicitFactoryId = req.query.factoryId as string | undefined;

    const sheet = await ProductionService.reopenSheet(id, req.user, explicitFactoryId);
    res.status(200).json(new ApiResponse('Production sheet reopened for editing successfully', sheet));
  } catch (err) {
    next(err);
  }
};

export const listSheets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const query = req.query as unknown as QueryProductionSheetInput;
    const explicitFactoryId = req.query.factoryId as string | undefined;

    const result = await ProductionService.listSheets(query, req.user, explicitFactoryId);
    res.status(200).json(new ApiResponse('Production sheets retrieved successfully', result));
  } catch (err) {
    next(err);
  }
};
