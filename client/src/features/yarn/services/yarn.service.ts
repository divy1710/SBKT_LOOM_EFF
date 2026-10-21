import apiClient from '@/lib/axios';
import type {
  Yarn,
  CreateYarnInput,
  UpdateYarnInput,
  YarnQueryParams,
  YarnListResult,
} from '../types/yarn.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export const YarnService = {
  /**
   * Fetch paginated yarns with optional search and filters.
   */
  async getYarns(params?: YarnQueryParams): Promise<YarnListResult> {
    const cleanParams: Record<string, string | number | boolean> = {};

    if (params) {
      if (params.page !== undefined) cleanParams['page'] = params.page;
      if (params.limit !== undefined) cleanParams['limit'] = params.limit;
      if (params.search && params.search.trim()) cleanParams['search'] = params.search.trim();
      if (params.yarnType) cleanParams['yarnType'] = params.yarnType;
      if (params.isActive !== undefined && params.isActive !== '') cleanParams['isActive'] = params.isActive;
      if (params.sortBy) cleanParams['sortBy'] = params.sortBy;
      if (params.sortOrder) cleanParams['sortOrder'] = params.sortOrder;
      if (params.factoryId) cleanParams['factoryId'] = params.factoryId;
    }

    const response = await apiClient.get<ApiResponse<YarnListResult>>('/yarn', {
      params: cleanParams,
    });
    return response.data.data;
  },

  /**
   * Fetch single yarn details by ID.
   */
  async getYarnById(id: string): Promise<Yarn> {
    const response = await apiClient.get<ApiResponse<Yarn>>(`/yarn/${id}`);
    return response.data.data;
  },

  /**
   * Create a new yarn record.
   */
  async createYarn(input: CreateYarnInput): Promise<Yarn> {
    const response = await apiClient.post<ApiResponse<Yarn>>('/yarn', input);
    return response.data.data;
  },

  /**
   * Update yarn specifications.
   */
  async updateYarn(id: string, input: UpdateYarnInput): Promise<Yarn> {
    const response = await apiClient.patch<ApiResponse<Yarn>>(`/yarn/${id}`, input);
    return response.data.data;
  },

  /**
   * Soft activate / deactivate yarn.
   */
  async updateYarnStatus(id: string, isActive: boolean): Promise<Yarn> {
    const response = await apiClient.patch<ApiResponse<Yarn>>(`/yarn/${id}/status`, {
      isActive,
    });
    return response.data.data;
  },
};
