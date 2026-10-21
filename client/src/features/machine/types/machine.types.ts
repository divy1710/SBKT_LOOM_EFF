export enum MachineStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  MAINTENANCE = 'MAINTENANCE',
}

export interface PopulatedMachineFabric {
  id: string;
  name: string;
  code: string;
  ppi: number;
  panno: number;
  recommendedRpm?: number;
}

export interface PopulatedMachineBeam {
  id: string;
  beamNumber: string;
  originalLengthMeters: number;
  remainingLengthMeters: number;
  status: string;
}

export interface Machine {
  id: string;
  machineNumber: string;
  name: string;
  factoryId: string;
  fabricId: string;
  fabric?: PopulatedMachineFabric;
  loadedBeamId?: string;
  loadedBeam?: PopulatedMachineBeam;
  rpm: number;
  ppi: number;
  status: MachineStatus;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MachinePagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateMachineInput {
  machineNumber: string;
  name: string;
  fabricId: string;
  rpm: number;
  ppi: number;
  status?: MachineStatus;
  notes?: string;
}

export interface UpdateMachineInput {
  machineNumber?: string;
  name?: string;
  fabricId?: string;
  rpm?: number;
  ppi?: number;
  notes?: string;
}

export interface UpdateMachineStatusInput {
  status: MachineStatus;
  notes?: string;
}

export interface BatchUpdateMachineInput {
  machineIds: string[];
  updates: {
    fabricId?: string;
    rpm?: number;
    ppi?: number;
    notes?: string;
  };
}

export interface BatchUpdateResult {
  updatedCount: number;
  failedCount: number;
  successfulIds: string[];
  errors?: Array<{ machineId: string; error: string }>;
}

export interface MachineLoadBeamInput {
  beamId: string;
  notes?: string;
}

export interface MachineUnloadBeamInput {
  endingMeters?: number;
  outcomeStatus?: 'IN_GODOWN' | 'FINISHED' | 'SHORTAGE';
  notes?: string;
}

export interface MachineQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: MachineStatus;
  fabricId?: string;
  isActive?: boolean | 'all';
  sortBy?: 'machineNumber' | 'name' | 'rpm' | 'ppi' | 'status' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const MACHINE_STATUS_CONFIG: Record<
  MachineStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  [MachineStatus.RUNNING]: {
    label: 'Running',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  [MachineStatus.STOPPED]: {
    label: 'Stopped',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-400',
  },
  [MachineStatus.MAINTENANCE]: {
    label: 'Maintenance',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
  },
};
