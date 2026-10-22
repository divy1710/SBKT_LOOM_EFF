import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Factory, IFactory, IProductionPreferences } from '../factory/factory.model';
import { User, IUser, toSafeUser, SafeUser } from '../user/user.model';
import { ApiError } from '../../utils/ApiError';
import { isDbConnected, getDbState } from '../../config/database';
import {
  UpdateFactoryProfileInput,
  UpdateProductionPreferencesInput,
  UpdateUserProfileInput,
  UpdateUserPreferencesInput,
} from './settings.validation';

const BCRYPT_ROUNDS = 12;

const DEFAULT_FACTORY_NAME = 'Shree Brahmanikrupa Textile';
const DEFAULT_FACTORY_CODE = 'SBKT-01';

const DEFAULT_PRODUCTION_PREFERENCES: IProductionPreferences = {
  dayShiftDurationHours: 11,
  nightShiftDurationHours: 13,
  dayShiftStartTime: '08:00',
  nightShiftStartTime: '19:00',
  defaultEfficiencyMode: 'AUTO',
  lowBeamMeterAlertThreshold: 200,
};

export class SettingsService {
  /**
   * Resolves the primary factory or the user's assigned factory.
   * If no factory exists in DB, safely creates the initial factory with default name.
   */
  async resolveFactory(factoryId?: string): Promise<IFactory> {
    if (factoryId && mongoose.Types.ObjectId.isValid(factoryId)) {
      const existing = await Factory.findById(factoryId);
      if (existing) return existing;
    }

    // Fallback to first factory in DB
    const firstFactory = await Factory.findOne().sort({ createdAt: 1 });
    if (firstFactory) return firstFactory;

    // Create initial factory if database is fresh
    return await Factory.create({
      name: DEFAULT_FACTORY_NAME,
      code: DEFAULT_FACTORY_CODE,
      timezone: 'Asia/Kolkata',
      productionPreferences: DEFAULT_PRODUCTION_PREFERENCES,
      isActive: true,
    });
  }

  /**
   * Get factory profile
   */
  async getFactoryProfile(factoryId?: string) {
    const factory = await this.resolveFactory(factoryId);
    return {
      id: factory._id.toString(),
      name: factory.name,
      code: factory.code,
      address: factory.address ?? '',
      phone: factory.phone ?? '',
      email: factory.email ?? '',
      logo: factory.logo ?? null,
      timezone: factory.timezone || 'Asia/Kolkata',
      createdAt: factory.createdAt,
      updatedAt: factory.updatedAt,
    };
  }

  /**
   * Update factory profile (authorized admins only)
   */
  async updateFactoryProfile(factoryId: string | undefined, input: UpdateFactoryProfileInput) {
    const factory = await this.resolveFactory(factoryId);

    if (input.name !== undefined && input.name.trim().length > 0) {
      factory.name = input.name.trim();
    }
    if (input.address !== undefined) {
      factory.address = input.address.trim();
    }
    if (input.phone !== undefined) {
      factory.phone = input.phone.trim();
    }
    if (input.email !== undefined) {
      factory.email = input.email.trim();
    }
    if (input.logo !== undefined) {
      factory.logo = input.logo ?? undefined;
    }

    await factory.save();

    return {
      id: factory._id.toString(),
      name: factory.name,
      code: factory.code,
      address: factory.address ?? '',
      phone: factory.phone ?? '',
      email: factory.email ?? '',
      logo: factory.logo ?? null,
      timezone: factory.timezone || 'Asia/Kolkata',
      updatedAt: factory.updatedAt,
    };
  }

  /**
   * Get production preferences
   */
  async getProductionPreferences(factoryId?: string): Promise<IProductionPreferences> {
    const factory = await this.resolveFactory(factoryId);
    if (!factory.productionPreferences) {
      return DEFAULT_PRODUCTION_PREFERENCES;
    }
    return {
      dayShiftDurationHours: factory.productionPreferences.dayShiftDurationHours ?? 11,
      nightShiftDurationHours: factory.productionPreferences.nightShiftDurationHours ?? 13,
      dayShiftStartTime: factory.productionPreferences.dayShiftStartTime ?? '08:00',
      nightShiftStartTime: factory.productionPreferences.nightShiftStartTime ?? '19:00',
      defaultEfficiencyMode: factory.productionPreferences.defaultEfficiencyMode ?? 'AUTO',
      lowBeamMeterAlertThreshold: factory.productionPreferences.lowBeamMeterAlertThreshold ?? 200,
    };
  }

  /**
   * Update production preferences (authorized admins only)
   */
  async updateProductionPreferences(factoryId: string | undefined, input: UpdateProductionPreferencesInput) {
    const factory = await this.resolveFactory(factoryId);

    factory.productionPreferences = {
      dayShiftDurationHours: input.dayShiftDurationHours,
      nightShiftDurationHours: input.nightShiftDurationHours,
      dayShiftStartTime: input.dayShiftStartTime,
      nightShiftStartTime: input.nightShiftStartTime,
      defaultEfficiencyMode: input.defaultEfficiencyMode,
      lowBeamMeterAlertThreshold: input.lowBeamMeterAlertThreshold,
    };

    await factory.save();
    return factory.productionPreferences;
  }

  /**
   * Update current authenticated user profile
   */
  async updateUserProfile(userId: string, input: UpdateUserProfileInput): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
      const emailTaken = await User.findOne({
        email: input.email.toLowerCase(),
        _id: { $ne: user._id },
      });
      if (emailTaken) {
        throw new ApiError(409, 'Email address is already in use by another account');
      }
      user.email = input.email.toLowerCase();
    }

    if (input.name && input.name.trim().length >= 2) {
      user.name = input.name.trim();
    }

    await user.save();
    return toSafeUser(user);
  }

  /**
   * Update user display preferences (theme & language)
   */
  async updateUserPreferences(userId: string, input: UpdateUserPreferencesInput): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.preferences) {
      user.preferences = {};
    }

    if (input.theme) {
      user.preferences.theme = input.theme;
    }
    if (input.language) {
      user.preferences.language = input.language;
    }

    await user.save();
    return toSafeUser(user);
  }

  /**
   * Change authenticated user password
   */
  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const matches = await bcrypt.compare(currentPass, user.passwordHash);
    if (!matches) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPass, BCRYPT_ROUNDS);
    user.passwordChangedAt = new Date();
    await user.save();
  }

  /**
   * Safe system health & diagnostics
   */
  async getSystemDiagnostics() {
    const dbConnected = isDbConnected();
    const dbState = getDbState();

    let dbLatencyMs: number | null = null;
    if (dbConnected && mongoose.connection.db) {
      const start = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        dbLatencyMs = Date.now() - start;
      } catch {
        dbLatencyMs = null;
      }
    }

    return {
      application: {
        name: 'SBKT Loom Production & Efficiency Management System',
        version: '1.0.0',
        environment: process.env['NODE_ENV'] ?? 'development',
      },
      server: {
        status: 'ONLINE',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        serverTime: new Date().toISOString(),
      },
      database: {
        status: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
        provider: 'MongoDB',
        state: dbState,
        latencyMs: dbLatencyMs,
      },
      features: [
        { id: 'phase1', name: 'Project Foundation', active: true },
        { id: 'phase2', name: 'Authentication & User Management', active: true },
        { id: 'phase3', name: 'Yarn Master', active: true },
        { id: 'phase4', name: 'Fabric Master', active: true },
        { id: 'phase5', name: 'Beam Master', active: true },
        { id: 'phase6', name: 'Machine Management', active: true },
        { id: 'phase7', name: 'Production Sheet', active: true },
        { id: 'phase8', name: 'Analytics & Reporting', active: true },
        { id: 'phase9', name: 'Settings & System Configuration', active: true },
      ],
    };
  }
}

export const settingsService = new SettingsService();
