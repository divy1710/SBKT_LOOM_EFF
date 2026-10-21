import apiClient from '@/lib/axios';
import type {
  AnalyticsShift,
  ProductionSummaryData,
  ProductionTrendItem,
  MachineAnalyticsData,
  FabricQualityAnalyticsData,
  MachinePerformanceData,
  EfficiencySummaryData,
  MachineEfficiencyTrendData,
  MachineEfficiencyDetailRow,
  EfficiencyRankingData,
} from '../types/analytics.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ActiveMachineOption {
  id: string;
  machineNumber: string;
  name: string;
}

export class AnalyticsService {
  static async getProductionSummary(params: {
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
  }): Promise<ProductionSummaryData> {
    const res = await apiClient.get<ApiResponse<ProductionSummaryData>>(
      '/analytics/production-summary',
      { params },
    );
    return res.data.data;
  }

  static async getProductionTrend(params: {
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
  }): Promise<ProductionTrendItem[]> {
    const res = await apiClient.get<ApiResponse<ProductionTrendItem[]>>(
      '/analytics/production-trend',
      { params },
    );
    return res.data.data;
  }

  static async getMachineAnalytics(params: {
    machineId: string;
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
  }): Promise<MachineAnalyticsData> {
    const res = await apiClient.get<ApiResponse<MachineAnalyticsData>>(
      '/analytics/machine',
      { params },
    );
    return res.data.data;
  }

  static async getFabricQuality(params: {
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
  }): Promise<FabricQualityAnalyticsData> {
    const res = await apiClient.get<ApiResponse<FabricQualityAnalyticsData>>(
      '/analytics/fabric-quality',
      { params },
    );
    return res.data.data;
  }

  static async getMachinePerformance(params: {
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
    threshold?: number;
    thresholdType?: 'AVERAGE' | 'TOTAL';
  }): Promise<MachinePerformanceData> {
    const res = await apiClient.get<ApiResponse<MachinePerformanceData>>(
      '/analytics/machine-performance',
      { params },
    );
    return res.data.data;
  }

  static async getEfficiencySummary(params: {
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
  }): Promise<EfficiencySummaryData> {
    const res = await apiClient.get<ApiResponse<EfficiencySummaryData>>(
      '/analytics/efficiency-summary',
      { params },
    );
    return res.data.data;
  }

  static async getMachineEfficiencyTrend(params: {
    machineId: string;
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
  }): Promise<MachineEfficiencyTrendData> {
    const res = await apiClient.get<ApiResponse<MachineEfficiencyTrendData>>(
      '/analytics/machine-efficiency-trend',
      { params },
    );
    return res.data.data;
  }

  static async getMachineEfficiencyDetails(params: {
    machineId: string;
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: MachineEfficiencyDetailRow[]; pagination: { totalPages: number; totalItems: number } }> {
    const res = await apiClient.get<
      ApiResponse<{ items: MachineEfficiencyDetailRow[]; pagination: { totalPages: number; totalItems: number } }>
    >('/analytics/machine-efficiency-details', { params });
    return res.data.data;
  }

  static async getEfficiencyRanking(params: {
    startDate: string;
    endDate: string;
    shift: AnalyticsShift;
    minEfficiencyThreshold?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<EfficiencyRankingData> {
    const res = await apiClient.get<ApiResponse<EfficiencyRankingData>>(
      '/analytics/efficiency-ranking',
      { params },
    );
    return res.data.data;
  }

  static async getActiveMachines(): Promise<ActiveMachineOption[]> {
    const res = await apiClient.get<ApiResponse<{ items?: any[]; machines?: any[] }>>('/machines', {
      params: { isActive: 'true', limit: 100, sortBy: 'machineNumber', sortOrder: 'asc' },
    });
    const list = res.data.data.items || res.data.data.machines || [];
    return list.map((m: any) => ({
      id: m.id || m._id,
      machineNumber: m.machineNumber,
      name: m.name,
    }));
  }
}
