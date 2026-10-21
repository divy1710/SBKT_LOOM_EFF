import apiClient from '@/lib/axios';
import type {
  Machine,
  CreateMachineInput,
  UpdateMachineInput,
  UpdateMachineStatusInput,
  BatchUpdateMachineInput,
  BatchUpdateResult,
  MachineLoadBeamInput,
  MachineUnloadBeamInput,
  MachineQueryParams,
  MachinePagination,
} from '../types/machine.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface MachineListResult {
  machines: Machine[];
  pagination: MachinePagination;
}

export interface FabricOption {
  id: string;
  name: string;
  code: string;
  ppi: number;
  panno: number;
  recommendedRpm?: number;
}

export interface AvailableBeamOption {
  id: string;
  beamNumber: string;
  pipeNumber?: string;
  remainingLengthMeters: number;
  status: string;
}

export const MachineService = {
  // ── Get list with filters & pagination ──────────────────────────────────────
  async getMachines(params: MachineQueryParams = {}): Promise<MachineListResult> {
    const queryParams: Record<string, string | number | boolean> = {};

    if (params.page !== undefined) queryParams['page'] = params.page;
    if (params.limit !== undefined) queryParams['limit'] = params.limit;
    if (params.search?.trim()) queryParams['search'] = params.search.trim();
    if (params.status) queryParams['status'] = params.status;
    if (params.fabricId) queryParams['fabricId'] = params.fabricId;
    if (params.isActive !== undefined && params.isActive !== 'all') {
      queryParams['isActive'] = params.isActive;
    }
    if (params.sortBy) queryParams['sortBy'] = params.sortBy;
    if (params.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    const response = await apiClient.get<ApiResponse<MachineListResult>>('/machines', {
      params: queryParams,
    });
    return response.data.data;
  },

  // ── Get single machine ──────────────────────────────────────────────────────
  async getMachineById(id: string): Promise<Machine> {
    const response = await apiClient.get<ApiResponse<Machine>>(`/machines/${id}`);
    return response.data.data;
  },

  // ── Create machine ──────────────────────────────────────────────────────────
  async createMachine(input: CreateMachineInput): Promise<Machine> {
    const response = await apiClient.post<ApiResponse<Machine>>('/machines', input);
    return response.data.data;
  },

  // ── Update machine ──────────────────────────────────────────────────────────
  async updateMachine(id: string, input: UpdateMachineInput): Promise<Machine> {
    const response = await apiClient.patch<ApiResponse<Machine>>(`/machines/${id}`, input);
    return response.data.data;
  },

  // ── Update machine status ───────────────────────────────────────────────────
  async updateMachineStatus(id: string, input: UpdateMachineStatusInput): Promise<Machine> {
    const response = await apiClient.patch<ApiResponse<Machine>>(`/machines/${id}/status`, input);
    return response.data.data;
  },

  // ── Toggle machine active ───────────────────────────────────────────────────
  async toggleMachineActive(id: string): Promise<Machine> {
    const response = await apiClient.patch<ApiResponse<Machine>>(`/machines/${id}/active`);
    return response.data.data;
  },

  // ── Batch update machines ───────────────────────────────────────────────────
  async batchUpdateMachines(input: BatchUpdateMachineInput): Promise<BatchUpdateResult> {
    const response = await apiClient.patch<ApiResponse<BatchUpdateResult>>('/machines/batch', input);
    return response.data.data;
  },

  // ── Load beam onto machine ──────────────────────────────────────────────────
  async loadBeam(machineId: string, input: MachineLoadBeamInput): Promise<Machine> {
    const response = await apiClient.post<ApiResponse<Machine>>(
      `/machines/${machineId}/load-beam`,
      input,
    );
    return response.data.data;
  },

  // ── Unload beam from machine ────────────────────────────────────────────────
  async unloadBeam(machineId: string, input: MachineUnloadBeamInput): Promise<Machine> {
    const response = await apiClient.post<ApiResponse<Machine>>(
      `/machines/${machineId}/unload-beam`,
      input,
    );
    return response.data.data;
  },

  // ── Get active fabric options ───────────────────────────────────────────────
  async getActiveFabrics(): Promise<FabricOption[]> {
    const allFabrics: FabricOption[] = [];
    let currentPage = 1;
    let totalPages = 1;
    const limit = 100;

    do {
      const response = await apiClient.get<
        ApiResponse<{
          items: Array<{
            id: string;
            name: string;
            code: string;
            ppi: number;
            panno: number;
            recommendedRpm?: number;
          }>;
          pagination: {
            page: number;
            limit: number;
            totalItems: number;
            totalPages: number;
          };
        }>
      >('/fabrics', {
        params: { isActive: 'true', limit, page: currentPage, sortBy: 'name', sortOrder: 'asc' },
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
            recommendedRpm: f.recommendedRpm,
          })),
        );
      }

      totalPages = responseData?.pagination?.totalPages || 1;
      currentPage += 1;
    } while (currentPage <= totalPages);

    return allFabrics;
  },

  // ── Get available beams for loading ─────────────────────────────────────────
  async getAvailableBeams(): Promise<AvailableBeamOption[]> {
    const allBeams: AvailableBeamOption[] = [];
    let currentPage = 1;
    let totalPages = 1;
    const limit = 100;

    do {
      const response = await apiClient.get<
        ApiResponse<{
          items: Array<{
            id: string;
            beamNumber: string;
            pipeNumber?: string;
            remainingLengthMeters: number;
            status: string;
          }>;
          pagination: {
            page: number;
            limit: number;
            totalItems: number;
            totalPages: number;
          };
        }>
      >('/beams', {
        params: {
          status: 'IN_GODOWN',
          isActive: 'true',
          limit,
          page: currentPage,
          sortBy: 'beamNumber',
          sortOrder: 'asc',
        },
      });

      const responseData = response.data?.data;
      if (responseData?.items && Array.isArray(responseData.items)) {
        allBeams.push(
          ...responseData.items.map((b) => ({
            id: b.id,
            beamNumber: b.beamNumber,
            pipeNumber: b.pipeNumber,
            remainingLengthMeters: b.remainingLengthMeters,
            status: b.status,
          })),
        );
      }

      totalPages = responseData?.pagination?.totalPages || 1;
      currentPage += 1;
    } while (currentPage <= totalPages);

    return allBeams;
  },
};
