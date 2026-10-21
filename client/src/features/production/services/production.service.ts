import apiClient from '@/lib/axios';
import {
  ShiftType,
  ProductionMachineStatus,
} from '../types/production.types';
import type {
  ProductionSheet,
  SaveProductionSheetInput,
} from '../types/production.types';

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
  status: ProductionMachineStatus;
  rpm: number;
  ppi: number;
  fabricId?: string;
  fabric?: {
    id: string;
    name: string;
    code: string;
    ppi: number;
    panno: number;
    recommendedRpm?: number;
  };
}

export class ProductionService {
  /**
   * Retrieves the saved production sheet for a specific date and shift
   */
  static async getByDate(date: string, shift: ShiftType): Promise<ProductionSheet | null> {
    const response = await apiClient.get<ApiResponse<ProductionSheet | null>>(
      '/production-sheets/by-date',
      {
        params: { date, shift },
      },
    );
    return response.data.data;
  }

  /**
   * Saves or creates a production sheet (Draft or Completed)
   */
  static async saveSheet(input: SaveProductionSheetInput): Promise<ProductionSheet> {
    const response = await apiClient.post<ApiResponse<ProductionSheet>>(
      '/production-sheets',
      input,
    );
    return response.data.data;
  }

  /**
   * Completes and locks a production sheet
   */
  static async completeSheet(id: string): Promise<ProductionSheet> {
    const response = await apiClient.post<ApiResponse<ProductionSheet>>(
      `/production-sheets/${id}/complete`,
    );
    return response.data.data;
  }

  /**
   * Reopens a completed production sheet for editing (admin / manager)
   */
  static async reopenSheet(id: string): Promise<ProductionSheet> {
    const response = await apiClient.post<ApiResponse<ProductionSheet>>(
      `/production-sheets/${id}/reopen`,
    );
    return response.data.data;
  }

  /**
   * Fetches all active machines for the factory in stable sorted order
   */
  static async getActiveMachines(): Promise<ActiveMachineOption[]> {
    const allMachines: ActiveMachineOption[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await apiClient.get<
        ApiResponse<{
          items?: any[];
          machines?: any[];
          pagination?: { totalPages: number };
        }>
      >('/machines', {
        params: {
          isActive: 'true',
          limit: 100,
          page: currentPage,
          sortBy: 'machineNumber',
          sortOrder: 'asc',
        },
      });

      const responseData = response.data.data;
      const rawList = Array.isArray(responseData?.items)
        ? responseData.items
        : Array.isArray(responseData?.machines)
          ? responseData.machines
          : [];

      for (const m of rawList) {
        allMachines.push({
          id: m.id || m._id,
          machineNumber: m.machineNumber,
          name: m.name,
          status: m.status as ProductionMachineStatus,
          rpm: m.rpm,
          ppi: m.ppi,
          fabricId: m.fabricId,
          fabric: m.fabric
            ? {
                id: m.fabric.id || m.fabric._id,
                name: m.fabric.name,
                code: m.fabric.code,
                ppi: m.fabric.ppi,
                panno: m.fabric.panno,
                recommendedRpm: m.fabric.recommendedRpm,
              }
            : undefined,
        });
      }

      totalPages = responseData?.pagination?.totalPages || 1;
      currentPage++;
    } while (currentPage <= totalPages);

    return allMachines;
  }
}
