// ─── Beam Types ─────────────────────────────────────────────────────────────

export enum BeamStatus {
  IN_GODOWN = 'IN_GODOWN',
  LOADED = 'LOADED',
  FINISHED = 'FINISHED',
  SHORTAGE = 'SHORTAGE',
}

export const BEAM_STATUS_LABELS: Record<BeamStatus, string> = {
  [BeamStatus.IN_GODOWN]: 'In Godown',
  [BeamStatus.LOADED]: 'Loaded',
  [BeamStatus.FINISHED]: 'Finished',
  [BeamStatus.SHORTAGE]: 'Shortage',
};

export const BEAM_STATUS_COLORS: Record<
  BeamStatus,
  { bg: string; text: string; border: string; badge: string }
> = {
  [BeamStatus.IN_GODOWN]: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  },
  [BeamStatus.LOADED]: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  },
  [BeamStatus.FINISHED]: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    badge: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  },
  [BeamStatus.SHORTAGE]: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  },
};

export interface Beam {
  id: string;
  beamNumber: string;
  pipeNumber?: string;
  factoryId: string;
  fabricId: string;
  fabric?: {
    id: string;
    name: string;
    code: string;
    ppi: number;
    panno: number;
  };
  warpYarnId: string;
  warpYarn?: {
    id: string;
    name: string;
    denier: number;
    yarnType: string;
  };
  originalLengthMeters: number;
  remainingLengthMeters: number;
  usedLengthMeters: number;
  isLowMeters: boolean;
  ends: number;
  widthInches?: number;
  status: BeamStatus;
  loadedMachineId?: string;
  loadedMachineNumber?: string;
  loadedAt?: string;
  unloadedAt?: string;
  alertAtMeters: number;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeamInput {
  beamNumber: string;
  pipeNumber?: string;
  fabricId: string;
  warpYarnId: string;
  originalLengthMeters: number;
  remainingLengthMeters?: number;
  ends: number;
  widthInches?: number;
  alertAtMeters?: number;
  notes?: string;
  factoryId?: string;
}

export interface UpdateBeamInput {
  beamNumber?: string;
  pipeNumber?: string;
  fabricId?: string;
  warpYarnId?: string;
  originalLengthMeters?: number;
  remainingLengthMeters?: number;
  ends?: number;
  widthInches?: number;
  alertAtMeters?: number;
  notes?: string;
}

export interface UpdateBeamStatusInput {
  status: BeamStatus;
  notes?: string;
}

export interface LoadBeamInput {
  machineNumber?: string;
  notes?: string;
}

export interface UnloadBeamInput {
  outcomeStatus: BeamStatus.IN_GODOWN | BeamStatus.FINISHED | BeamStatus.SHORTAGE;
  endingMeters?: number;
  notes?: string;
}

export interface BeamHistory {
  id: string;
  factoryId: string;
  beamId: string;
  machineId?: string;
  machineNumber?: string;
  loadedAt: string;
  unloadedAt?: string;
  startingMeters: number;
  endingMeters?: number;
  usedMeters?: number;
  status: BeamStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface BeamQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: BeamStatus;
  fabricId?: string;
  warpYarnId?: string;
  isActive?: string | boolean;
  lowMeters?: string | boolean;
  sortBy?:
    | 'beamNumber'
    | 'originalLengthMeters'
    | 'remainingLengthMeters'
    | 'ends'
    | 'status'
    | 'createdAt'
    | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  factoryId?: string;
}

export interface BeamPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface BeamListResult {
  items: Beam[];
  pagination: BeamPagination;
}

export interface FabricOption {
  id: string;
  name: string;
  code: string;
  ppi: number;
  panno: number;
  warpYarnId: string;
}
