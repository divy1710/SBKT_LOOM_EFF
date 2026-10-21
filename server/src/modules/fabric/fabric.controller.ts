import { Request, Response, NextFunction } from 'express';
import { FabricService } from './fabric.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import type {
  CreateFabricInput,
  UpdateFabricInput,
  UpdateFabricStatusInput,
  QueryFabricInput,
} from './fabric.validation';

export const createFabric = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const data = await FabricService.createFabric(req.body as CreateFabricInput, req.user);
    res.status(201).json(new ApiResponse('Fabric created successfully', data));
  } catch (err) {
    next(err);
  }
};

export const listFabrics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const query = req.query as unknown as QueryFabricInput;
    const result = await FabricService.getFabrics(query, req.user);
    res.status(200).json(new ApiResponse('Fabric records retrieved successfully', result));
  } catch (err) {
    next(err);
  }
};

export const getFabric = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const fabric = await FabricService.getFabricById(id, req.user);
    res.status(200).json(new ApiResponse('Fabric retrieved successfully', fabric));
  } catch (err) {
    next(err);
  }
};

export const updateFabric = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const updated = await FabricService.updateFabric(id, req.body as UpdateFabricInput, req.user);
    res.status(200).json(new ApiResponse('Fabric updated successfully', updated));
  } catch (err) {
    next(err);
  }
};

export const changeFabricStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const { isActive } = req.body as UpdateFabricStatusInput;
    const updated = await FabricService.updateFabricStatus(id, isActive, req.user);
    res.status(200).json(
      new ApiResponse(
        isActive ? 'Fabric activated successfully' : 'Fabric deactivated successfully',
        updated,
      ),
    );
  } catch (err) {
    next(err);
  }
};
