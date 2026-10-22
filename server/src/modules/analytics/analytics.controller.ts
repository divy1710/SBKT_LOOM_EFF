import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import {
  BaseAnalyticsQuery,
  MachineAnalyticsQuery,
  MachinePerformanceQuery,
  EfficiencyRankingQuery,
  MachineEfficiencyDetailsQuery,
} from './analytics.validation';

export const getProductionSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getProductionSummary(
      req.user,
      req.query as unknown as BaseAnalyticsQuery,
    );
    res.status(200).json(new ApiResponse('Production summary analytics retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getProductionTrend = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getProductionTrend(
      req.user,
      req.query as unknown as BaseAnalyticsQuery,
    );
    res.status(200).json(new ApiResponse('Production trend retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getMachineAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getMachineAnalytics(
      req.user,
      req.query as unknown as MachineAnalyticsQuery,
    );
    res.status(200).json(new ApiResponse('Machine analytics retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getFabricQualityAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getFabricQualityAnalytics(
      req.user,
      req.query as unknown as BaseAnalyticsQuery,
    );
    res.status(200).json(new ApiResponse('Fabric quality analytics retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getMachinePerformance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getMachinePerformance(
      req.user,
      req.query as unknown as MachinePerformanceQuery,
    );
    res.status(200).json(new ApiResponse('Machine performance analytics retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getEfficiencySummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getEfficiencySummary(
      req.user,
      req.query as unknown as BaseAnalyticsQuery,
    );
    res.status(200).json(new ApiResponse('Efficiency summary analytics retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getMachineEfficiencyTrend = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getMachineEfficiencyTrend(
      req.user,
      req.query as unknown as MachineAnalyticsQuery,
    );
    res.status(200).json(new ApiResponse('Machine efficiency trend retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getMachineEfficiencyDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getMachineEfficiencyDetails(
      req.user,
      req.query as unknown as MachineEfficiencyDetailsQuery,
    );
    res.status(200).json(new ApiResponse('Machine efficiency details retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getEfficiencyRanking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getEfficiencyRanking(
      req.user,
      req.query as unknown as EfficiencyRankingQuery,
    );
    res.status(200).json(new ApiResponse('Efficiency ranking retrieved', data));
  } catch (err) {
    next(err);
  }
};

export const getCrossFactoryAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const data = await AnalyticsService.getCrossFactoryAnalytics();
    res.status(200).json(new ApiResponse('Cross-factory analytics retrieved', data));
  } catch (err) {
    next(err);
  }
};
