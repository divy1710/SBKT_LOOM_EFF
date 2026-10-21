import { Request, Response, NextFunction } from 'express';
import { BeamService } from './beam.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import {
  CreateBeamInput,
  UpdateBeamInput,
  UpdateBeamStatusInput,
  LoadBeamInput,
  UnloadBeamInput,
  QueryBeamInput,
} from './beam.validation';

export const createBeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const data = await BeamService.createBeam(req.body as CreateBeamInput, req.user);
    res.status(201).json(new ApiResponse('Beam created successfully', data));
  } catch (err) {
    next(err);
  }
};

export const listBeams = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const query = req.query as unknown as QueryBeamInput;
    const result = await BeamService.getBeams(query, req.user);
    res.status(200).json(new ApiResponse('Beam records retrieved successfully', result));
  } catch (err) {
    next(err);
  }
};

export const getBeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const beam = await BeamService.getBeamById(id, req.user);
    res.status(200).json(new ApiResponse('Beam retrieved successfully', beam));
  } catch (err) {
    next(err);
  }
};

export const updateBeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const updated = await BeamService.updateBeam(id, req.body as UpdateBeamInput, req.user);
    res.status(200).json(new ApiResponse('Beam updated successfully', updated));
  } catch (err) {
    next(err);
  }
};

export const updateBeamStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const updated = await BeamService.updateBeamStatus(
      id,
      req.body as UpdateBeamStatusInput,
      req.user,
    );
    res.status(200).json(new ApiResponse('Beam status updated successfully', updated));
  } catch (err) {
    next(err);
  }
};

export const loadBeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const loaded = await BeamService.loadBeam(id, req.body as LoadBeamInput, req.user);
    res.status(200).json(new ApiResponse('Beam loaded onto machine successfully', loaded));
  } catch (err) {
    next(err);
  }
};

export const unloadBeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const unloaded = await BeamService.unloadBeam(id, req.body as UnloadBeamInput, req.user);
    res.status(200).json(new ApiResponse('Beam unloaded from machine successfully', unloaded));
  } catch (err) {
    next(err);
  }
};

export const getBeamHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const history = await BeamService.getBeamHistory(id, req.user);
    res.status(200).json(new ApiResponse('Beam history records retrieved successfully', history));
  } catch (err) {
    next(err);
  }
};

export const toggleBeamActive = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const { isActive } = req.body as { isActive: boolean };
    const result = await BeamService.toggleBeamActive(id, isActive, req.user);
    res.status(200).json(new ApiResponse('Beam active status updated successfully', result));
  } catch (err) {
    next(err);
  }
};
