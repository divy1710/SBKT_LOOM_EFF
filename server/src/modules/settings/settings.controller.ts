import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import {
  updateFactoryProfileSchema,
  updateProductionPreferencesSchema,
  updateUserProfileSchema,
  updateUserPreferencesSchema,
  changePasswordSchema,
} from './settings.validation';

export class SettingsController {
  /**
   * GET /api/v1/settings/factory
   */
  async getFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const factoryId = req.user?.factoryId?.toString();
      const profile = await settingsService.getFactoryProfile(factoryId);
      res.status(200).json(new ApiResponse('Factory profile retrieved', profile).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/settings/factory
   */
  async updateFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateFactoryProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i: { message: string }) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const factoryId = req.user?.factoryId?.toString();
      const updated = await settingsService.updateFactoryProfile(factoryId, parsed.data);
      res.status(200).json(new ApiResponse('Factory profile updated successfully', updated).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/settings/production
   */
  async getProductionPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const factoryId = req.user?.factoryId?.toString();
      const prefs = await settingsService.getProductionPreferences(factoryId);
      res.status(200).json(new ApiResponse('Production preferences retrieved', prefs).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/settings/production
   */
  async updateProductionPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateProductionPreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i: { message: string }) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const factoryId = req.user?.factoryId?.toString();
      const updated = await settingsService.updateProductionPreferences(factoryId, parsed.data);
      res.status(200).json(new ApiResponse('Production preferences updated successfully', updated).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/settings/account/profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateUserProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i: { message: string }) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const userId = req.user!._id.toString();
      const updated = await settingsService.updateUserProfile(userId, parsed.data);
      res.status(200).json(new ApiResponse('Profile updated successfully', { user: updated }).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/settings/account/preferences
   */
  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateUserPreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i: { message: string }) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const userId = req.user!._id.toString();
      const updated = await settingsService.updateUserPreferences(userId, parsed.data);
      res.status(200).json(new ApiResponse('Preferences updated successfully', { user: updated }).toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/settings/account/change-password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i: { message: string }) => i.message).join('; ');
        return next(ApiError.badRequest(errorMsg));
      }

      const userId = req.user!._id.toString();
      await settingsService.changePassword(
        userId,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );

      res.status(200).json(new ApiResponse('Password changed successfully').toJSON());
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/settings/system
   */
  async getSystemDiagnostics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const diagnostics = await settingsService.getSystemDiagnostics();
      res.status(200).json(new ApiResponse('System diagnostics retrieved', diagnostics).toJSON());
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();
