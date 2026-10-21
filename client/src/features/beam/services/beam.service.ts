import apiClient from '@/lib/axios';
import type {
  Beam,
  CreateBeamInput,
  UpdateBeamInput,
  UpdateBeamStatusInput,
  LoadBeamInput,
  UnloadBeamInput,
  BeamQueryParams,
  BeamListResult,
  BeamHistory,
  FabricOption,
} from '../types/beam.types';
import type { YarnOption } from '@/features/fabric/types/fabric.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

interface FabricListData {
  items: Array<{
    id: string;
    name: string;
    code: string;
    ppi: number;
    panno: number;
    warpYarnId: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
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

export const BeamService = {
  /**
   * Fetch paginated beams with search and filters.
   */
  async getBeams(params?: BeamQueryParams): Promise<BeamListResult> {
    const cleanParams: Record<string, string | number | boolean> = {};
    if (params) {
      if (params.page !== undefined) cleanParams['page'] = params.page;
      if (params.limit !== undefined) cleanParams['limit'] = params.limit;
      if (params.search?.trim()) cleanParams['search'] = params.search.trim();
      if (params.status) cleanParams['status'] = params.status;
      if (params.fabricId) cleanParams['fabricId'] = params.fabricId;
      if (params.warpYarnId) cleanParams['warpYarnId'] = params.warpYarnId;
      if (params.isActive !== undefined && params.isActive !== '') {
        cleanParams['isActive'] = params.isActive;
      }
      if (params.lowMeters !== undefined && params.lowMeters !== '') {
        cleanParams['lowMeters'] = params.lowMeters;
      }
      if (params.sortBy) cleanParams['sortBy'] = params.sortBy;
      if (params.sortOrder) cleanParams['sortOrder'] = params.sortOrder;
      if (params.factoryId) cleanParams['factoryId'] = params.factoryId;
    }

    const response = await apiClient.get<ApiResponse<BeamListResult>>('/beams', {
      params: cleanParams,
    });
    return response.data.data;
  },

  /**
   * Fetch single beam details by ID.
   */
  async getBeamById(id: string): Promise<Beam> {
    const response = await apiClient.get<ApiResponse<Beam>>(`/beams/${id}`);
    return response.data.data;
  },

  /**
   * Create a new beam record.
   */
  async createBeam(input: CreateBeamInput): Promise<Beam> {
    const response = await apiClient.post<ApiResponse<Beam>>('/beams', input);
    return response.data.data;
  },

  /**
   * Update beam specifications.
   */
  async updateBeam(id: string, input: UpdateBeamInput): Promise<Beam> {
    const response = await apiClient.patch<ApiResponse<Beam>>(`/beams/${id}`, input);
    return response.data.data;
  },

  /**
   * Lifecycle status transition.
   */
  async updateBeamStatus(id: string, input: UpdateBeamStatusInput): Promise<Beam> {
    const response = await apiClient.patch<ApiResponse<Beam>>(`/beams/${id}/status`, input);
    return response.data.data;
  },

  /**
   * Load beam onto machine.
   */
  async loadBeam(id: string, input: LoadBeamInput): Promise<Beam> {
    const response = await apiClient.post<ApiResponse<Beam>>(`/beams/${id}/load`, input);
    return response.data.data;
  },

  /**
   * Unload beam from machine.
   */
  async unloadBeam(id: string, input: UnloadBeamInput): Promise<Beam> {
    const response = await apiClient.post<ApiResponse<Beam>>(`/beams/${id}/unload`, input);
    return response.data.data;
  },

  /**
   * Get loading/unloading history records for a beam.
   */
  async getBeamHistory(id: string): Promise<BeamHistory[]> {
    const response = await apiClient.get<ApiResponse<BeamHistory[]>>(`/beams/${id}/history`);
    return response.data.data;
  },

  /**
   * Soft activate / deactivate beam record.
   */
  async toggleBeamActive(id: string, isActive: boolean): Promise<Beam> {
    const response = await apiClient.patch<ApiResponse<Beam>>(`/beams/${id}/active`, {
      isActive,
    });
    return response.data.data;
  },

  /**
   * Fetch active fabrics for dropdown selection in Add Beam form.
   */
  async getActiveFabrics(): Promise<FabricOption[]> {
    const allFabrics: FabricOption[] = [];
    let currentPage = 1;
    let totalPages = 1;
    const limit = 100;

    do {
      const response = await apiClient.get<ApiResponse<FabricListData>>('/fabrics', {
        params: {
          isActive: 'true',
          limit,
          page: currentPage,
          sortBy: 'code',
          sortOrder: 'asc',
        },
      });

      const responseData = response.data?.data;
      if (responseData?.items && Array.isArray(responseData.items)) {
        allFabrics.push(
          ...responseData.items.map((f) => ({
            id: f.id,
            name: f.name,
            code: f.code,
            ppi: f.ppi,
            panno: f.panno,
            warpYarnId: f.warpYarnId,
          })),
        );
      }

      totalPages = responseData?.pagination?.totalPages || 1;
      currentPage += 1;
    } while (currentPage <= totalPages);

    return allFabrics;
  },

  /**
   * Fetch active yarns suitable for warp selection (WARP or BOTH).
   */
  async getActiveWarpYarns(): Promise<YarnOption[]> {
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

    // Return yarns that can be used for warp (WARP or BOTH)
    return allYarns.filter((y) => y.yarnType === 'WARP' || y.yarnType === 'BOTH');
  },
};
