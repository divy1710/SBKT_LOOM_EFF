export type YarnType = 'WARP' | 'WEFT' | 'BOTH';

export type RateUnit = 'KG' | 'CONE' | 'OTHER';

export interface Yarn {
  id: string;
  name: string;
  denier: number;
  yarnType: YarnType;
  rate: number;
  rateUnit: RateUnit;
  description?: string;
  factoryId: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateYarnInput {
  name: string;
  denier: number;
  yarnType: YarnType;
  rate: number;
  rateUnit: RateUnit;
  description?: string;
  factoryId?: string;
}

export interface UpdateYarnInput {
  name?: string;
  denier?: number;
  yarnType?: YarnType;
  rate?: number;
  rateUnit?: RateUnit;
  description?: string;
}

export interface YarnQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  yarnType?: YarnType;
  isActive?: string | boolean;
  sortBy?: 'name' | 'denier' | 'rate' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  factoryId?: string;
}

export interface YarnPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface YarnListResult {
  items: Yarn[];
  pagination: YarnPagination;
}
