import apiClient from '@/lib/axios';

export interface FactoryProfile {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string | null;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionPreferences {
  dayShiftDurationHours: number;
  nightShiftDurationHours: number;
  dayShiftStartTime: string;
  nightShiftStartTime: string;
  defaultEfficiencyMode: 'AUTO' | 'CUSTOM';
  lowBeamMeterAlertThreshold: number;
}

export interface SystemDiagnostics {
  application: {
    name: string;
    version: string;
    environment: string;
  };
  server: {
    status: 'ONLINE' | 'OFFLINE';
    nodeVersion: string;
    uptimeSeconds: number;
    serverTime: string;
  };
  database: {
    status: 'CONNECTED' | 'DISCONNECTED';
    provider: string;
    state: number;
    latencyMs: number | null;
  };
  features: Array<{
    id: string;
    name: string;
    active: boolean;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

class SettingsService {
  async getFactoryProfile(): Promise<FactoryProfile> {
    const res = await apiClient.get<ApiResponse<FactoryProfile>>('/settings/factory');
    return res.data.data;
  }

  async updateFactoryProfile(data: Partial<FactoryProfile>): Promise<FactoryProfile> {
    const res = await apiClient.patch<ApiResponse<FactoryProfile>>('/settings/factory', data);
    return res.data.data;
  }

  async getProductionPreferences(): Promise<ProductionPreferences> {
    const res = await apiClient.get<ApiResponse<ProductionPreferences>>('/settings/production');
    return res.data.data;
  }

  async updateProductionPreferences(data: ProductionPreferences): Promise<ProductionPreferences> {
    const res = await apiClient.patch<ApiResponse<ProductionPreferences>>('/settings/production', data);
    return res.data.data;
  }

  async updateProfile(data: { name?: string; email?: string }) {
    const res = await apiClient.patch<ApiResponse<{ user: any }>>('/settings/account/profile', data);
    return res.data.data.user;
  }

  async updatePreferences(data: { theme?: 'light' | 'dark' | 'system'; language?: 'en' | 'gu' | 'hi' }) {
    const res = await apiClient.patch<ApiResponse<{ user: any }>>('/settings/account/preferences', data);
    return res.data.data.user;
  }

  async changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    const res = await apiClient.post<ApiResponse<void>>('/settings/account/change-password', data);
    return res.data;
  }

  async getSystemDiagnostics(): Promise<SystemDiagnostics> {
    const res = await apiClient.get<ApiResponse<SystemDiagnostics>>('/settings/system');
    return res.data.data;
  }
}

export const settingsService = new SettingsService();
