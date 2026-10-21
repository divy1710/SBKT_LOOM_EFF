import apiClient from '@/lib/axios';
import type {
  Fabric,
  CreateFabricInput,
  UpdateFabricInput,
  FabricQueryParams,
  FabricListResult,
  YarnOption,
} from '../types/fabric.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

interface YarnListData {
  items: YarnOption[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export const FabricService = {
  /**
   * Fetch paginated fabric records with optional search and filters.
   */
  async getFabrics(params?: FabricQueryParams): Promise<FabricListResult> {
    const cleanParams: Record<string, string | number | boolean> = {};
    if (params) {
      if (params.page !== undefined) cleanParams['page'] = params.page;
      if (params.limit !== undefined) cleanParams['limit'] = params.limit;
      if (params.search?.trim()) cleanParams['search'] = params.search.trim();
      if (params.isActive !== undefined && params.isActive !== '') {
        cleanParams['isActive'] = params.isActive;
      }
      if (params.sortBy) cleanParams['sortBy'] = params.sortBy;
      if (params.sortOrder) cleanParams['sortOrder'] = params.sortOrder;
      if (params.factoryId) cleanParams['factoryId'] = params.factoryId;
    }
    const response = await apiClient.get<ApiResponse<FabricListResult>>('/fabrics', {
      params: cleanParams,
    });
    return response.data.data;
  },

  /**
   * Fetch a single fabric record by ID.
   */
  async getFabricById(id: string): Promise<Fabric> {
    const response = await apiClient.get<ApiResponse<Fabric>>(`/fabrics/${id}`);
    return response.data.data;
  },

  /**
   * Create a new fabric record.
   */
  async createFabric(input: CreateFabricInput): Promise<Fabric> {
    const response = await apiClient.post<ApiResponse<Fabric>>('/fabrics', input);
    return response.data.data;
  },

  /**
   * Update fabric specifications.
   */
  async updateFabric(id: string, input: UpdateFabricInput): Promise<Fabric> {
    const response = await apiClient.patch<ApiResponse<Fabric>>(`/fabrics/${id}`, input);
    return response.data.data;
  },

  /**
   * Soft activate / deactivate a fabric record.
   */
  async updateFabricStatus(id: string, isActive: boolean): Promise<Fabric> {
    const response = await apiClient.patch<ApiResponse<Fabric>>(`/fabrics/${id}/status`, {
      isActive,
    });
    return response.data.data;
  },

  /**
   * Fetch active yarns suitable for warp/weft dropdown selection.
   * Utilizes the existing Yarn API pagination mechanism with limit: 100
   * (respecting backend validation limit max 100) and pages through if needed.
   */
  async getActiveYarns(): Promise<YarnOption[]> {
    const allYarns: YarnOption[] = [];
    let currentPage = 1;
    let totalPages = 1;
    const limit = 100;

    do {
      const response = await apiClient.get<ApiResponse<YarnListData>>('/yarn', {
        params: {
          isActive: 'true',
          limit,
          page: currentPage,
          sortBy: 'name',
          sortOrder: 'asc',
        },
      });

      const responseData = response.data?.data;
      if (responseData?.items && Array.isArray(responseData.items)) {
        allYarns.push(...responseData.items);
      }

      totalPages = responseData?.pagination?.totalPages || 1;
      currentPage += 1;
    } while (currentPage <= totalPages);

    return allYarns;
  },
};
