import { Request, Response, NextFunction } from 'express';
import { YarnService } from './yarn.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import {
  CreateYarnInput,
  UpdateYarnInput,
  UpdateYarnStatusInput,
  QueryYarnInput,
} from './yarn.validation';

export const createYarn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const data = await YarnService.createYarn(
      req.body as CreateYarnInput,
      req.user,
    );

    res.status(201).json(new ApiResponse('Yarn created successfully', data));
  } catch (err) {
    next(err);
  }
};

export const listYarns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const query = req.query as unknown as QueryYarnInput;
    const result = await YarnService.getYarns(query, req.user);

    res.status(200).json(new ApiResponse('Yarn records retrieved successfully', result));
  } catch (err) {
    next(err);
  }
};

export const getYarn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const id = req.params['id'] as string;
    const yarn = await YarnService.getYarnById(id, req.user);

    res.status(200).json(new ApiResponse('Yarn retrieved successfully', yarn));
  } catch (err) {
    next(err);
  }
};

export const updateYarn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const id = req.params['id'] as string;
    const updated = await YarnService.updateYarn(
      id,
      req.body as UpdateYarnInput,
      req.user,
    );

    res.status(200).json(new ApiResponse('Yarn updated successfully', updated));
  } catch (err) {
    next(err);
  }
};

export const changeYarnStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const id = req.params['id'] as string;
    const { isActive } = req.body as UpdateYarnStatusInput;
    const updated = await YarnService.updateYarnStatus(
      id,
      isActive,
      req.user,
    );

    res.status(200).json(
      new ApiResponse(
        isActive ? 'Yarn activated successfully' : 'Yarn deactivated successfully',
        updated,
      ),
    );
  } catch (err) {
    next(err);
  }
};
