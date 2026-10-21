// ─── Fabric Types ─────────────────────────────────────────────────────────────

export interface Fabric {
  id: string;
  name: string;
  code: string;
  warpYarnId: string;
  weftYarnId: string;
  ppi: number;
  panno: number;
  wastagePercent: number;
  recommendedRpm?: number;
  description?: string;
  factoryId: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFabricInput {
  name: string;
  code: string;
  warpYarnId: string;
  weftYarnId: string;
  ppi: number;
  panno: number;
  wastagePercent: number;
  recommendedRpm?: number;
  description?: string;
  factoryId?: string;
}

export interface UpdateFabricInput {
  name?: string;
  code?: string;
  warpYarnId?: string;
  weftYarnId?: string;
  ppi?: number;
  panno?: number;
  wastagePercent?: number;
  recommendedRpm?: number;
  description?: string;
}

export interface FabricQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: string | boolean;
  sortBy?: 'name' | 'code' | 'ppi' | 'panno' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  factoryId?: string;
}

export interface FabricPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface FabricListResult {
  items: Fabric[];
  pagination: FabricPagination;
}

// ─── Yarn dropdown option (lightweight) ──────────────────────────────────────
export interface YarnOption {
  id: string;
  name: string;
  denier: number;
  yarnType: 'WARP' | 'WEFT' | 'BOTH';
  rateUnit?: string;
  isActive?: boolean;
}
