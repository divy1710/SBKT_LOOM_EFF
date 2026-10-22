import axiosInstance from '@/lib/axios';

export interface FactoryListItem {
  id: string;
  name: string;
  code: string;
  factoryName: string;
  factoryCode: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  contactEmail?: string;
  logo?: string;
  timezone: string;
  status: 'ACTIVE' | 'INACTIVE';
  isActive: boolean;
  userCount: number;
  machineCount: number;
  assignedAdmin?: {
    id: string;
    name: string;
    email: string;
    lastLoginAt?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface FactoryDetailData extends FactoryListItem {
  counts: {
    users: number;
    machines: number;
    yarns: number;
    fabrics: number;
    beams: number;
    productionSheets: number;
  };
  admins: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    lastLoginAt?: string;
  }>;
  recentActivity: Array<{
    id: string;
    timestamp: string;
    actorName: string;
    action: string;
    resourceType: string;
    outcome?: string;
  }>;
}

export interface CreateFactoryInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  logo?: string;
  timezone?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateFactoryInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  logo?: string;
  timezone?: string;
}

export interface FactoryAdminItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  assignedFactory?: {
    id: string;
    name: string;
    code: string;
    status: string;
  } | null;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
  factoryId: string;
}

export interface CrossFactoryAnalyticsSummary {
  totals: {
    totalPlatformMeters: number;
    totalPlatformMachines: number;
    totalPlatformUsers: number;
    overallPlatformEfficiency: number;
    totalActiveFactories: number;
  };
  factories: Array<{
    id: string;
    name: string;
    code: string;
    totalMeters: number;
    machineCount: number;
    userCount: number;
    averageEfficiency: number;
    completedSheetsCount: number;
  }>;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  factoryId?: string;
  factoryName?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export const superAdminService = {
  // Factories
  async getFactories(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const res = await axiosInstance.get('/factories', { params });
    return res.data.data;
  },

  async getFactoryById(id: string): Promise<FactoryDetailData> {
    const res = await axiosInstance.get(`/factories/${id}`);
    return res.data.data;
  },

  async createFactory(input: CreateFactoryInput) {
    const res = await axiosInstance.post('/factories', input);
    return res.data.data;
  },

  async updateFactory(id: string, input: UpdateFactoryInput) {
    const res = await axiosInstance.patch(`/factories/${id}`, input);
    return res.data.data;
  },

  async toggleFactoryStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    const res = await axiosInstance.patch(`/factories/${id}/status`, { status });
    return res.data.data;
  },

  // Factory Admins
  async getFactoryAdmins(): Promise<FactoryAdminItem[]> {
    const res = await axiosInstance.get('/factories/admins/all');
    return res.data.data;
  },

  async createFactoryAdmin(input: CreateAdminInput) {
    const res = await axiosInstance.post('/factories/admins', input);
    return res.data.data;
  },

  async reassignFactoryAdmin(adminId: string, factoryId: string) {
    const res = await axiosInstance.patch(`/factories/admins/${adminId}/assign`, { factoryId });
    return res.data.data;
  },

  // Cross Factory Analytics
  async getCrossFactoryAnalytics(): Promise<CrossFactoryAnalyticsSummary> {
    const res = await axiosInstance.get('/analytics/cross-factory');
    return res.data.data;
  },

  // Audit Logs
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    factoryId?: string;
    search?: string;
  }) {
    const res = await axiosInstance.get('/audit-logs', { params });
    return res.data.data;
  },
};
