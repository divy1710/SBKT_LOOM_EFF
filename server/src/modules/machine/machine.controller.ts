import { Request, Response, NextFunction } from 'express';
import { MachineService } from './machine.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import {
  CreateMachineInput,
  UpdateMachineInput,
  UpdateMachineStatusInput,
  BatchUpdateMachineInput,
  MachineQueryParams,
  MachineLoadBeamInput,
  MachineUnloadBeamInput,
} from './machine.validation';

// ─── Create Machine ───────────────────────────────────────────────────────────
export const createMachine = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const machine = await MachineService.createMachine(
      req.body as CreateMachineInput,
      req.user,
    );
    res.status(201).json(new ApiResponse('Machine created successfully', machine));
  } catch (err) {
    next(err);
  }
};

// ─── List Machines ────────────────────────────────────────────────────────────
export const listMachines = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const query = req.query as unknown as MachineQueryParams;
    const result = await MachineService.getMachines(query, req.user);
    res.status(200).json(new ApiResponse('Machine records retrieved successfully', result));
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Machine ───────────────────────────────────────────────────────
export const getMachine = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const machine = await MachineService.getMachineById(id, req.user);
    res.status(200).json(new ApiResponse('Machine retrieved successfully', machine));
  } catch (err) {
    next(err);
  }
};

// ─── Update Machine ───────────────────────────────────────────────────────────
export const updateMachine = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const machine = await MachineService.updateMachine(
      id,
      req.body as UpdateMachineInput,
      req.user,
    );
    res.status(200).json(new ApiResponse('Machine updated successfully', machine));
  } catch (err) {
    next(err);
  }
};

// ─── Update Machine Status ───────────────────────────────────────────────────
export const updateMachineStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const machine = await MachineService.updateMachineStatus(
      id,
      req.body as UpdateMachineStatusInput,
      req.user,
    );
    res.status(200).json(new ApiResponse('Machine status updated successfully', machine));
  } catch (err) {
    next(err);
  }
};

// ─── Toggle Machine Active ────────────────────────────────────────────────────
export const toggleMachineActive = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const id = req.params['id'] as string;
    const machine = await MachineService.toggleMachineActive(id, req.user);
    const msg = machine.isActive ? 'Machine activated successfully' : 'Machine deactivated successfully';
    res.status(200).json(new ApiResponse(msg, machine));
  } catch (err) {
    next(err);
  }
};

// ─── Batch Update Machines ───────────────────────────────────────────────────
export const batchUpdateMachines = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    const result = await MachineService.batchUpdateMachines(
      req.body as BatchUpdateMachineInput,
      req.user,
    );
    res.status(200).json(new ApiResponse('Batch update completed', result));
  } catch (err) {
    next(err);
  }
};

// ─── Load Beam onto Machine ──────────────────────────────────────────────────
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
    const machine = await MachineService.loadBeam(
      id,
      req.body as MachineLoadBeamInput,
      req.user,
    );
    res.status(200).json(new ApiResponse('Beam loaded onto machine successfully', machine));
  } catch (err) {
    next(err);
  }
};

// ─── Unload Beam from Machine ────────────────────────────────────────────────
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
    const machine = await MachineService.unloadBeam(
      id,
      req.body as MachineUnloadBeamInput,
      req.user,
    );
    res.status(200).json(new ApiResponse('Beam unloaded from machine successfully', machine));
  } catch (err) {
    next(err);
  }
};
