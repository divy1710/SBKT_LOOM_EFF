export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
}

export enum ProductionSheetStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
}

export enum EfficiencyMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum ProductionMachineStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  MAINTENANCE = 'MAINTENANCE',
}

export interface ProductionEntry {
  id: string;
  machineId: string;
  machineNumberSnapshot: string;
  machineNameSnapshot?: string;
  fabricId?: string;
  fabricNameSnapshot: string;
  fabricCodeSnapshot?: string;
  shift: ShiftType;
  productionDate: string; // 'YYYY-MM-DD'
  actualProductionMeters: number;
  efficiencyMode: EfficiencyMode;
  efficiencyPercent: number | null;
  rpmSnapshot: number;
  ppiSnapshot: number;
  shiftDurationHours: number;
  theoreticalProductionMeters: number | null;
  machineStatusSnapshot: ProductionMachineStatus;
  notes?: string;
}

export interface ProductionSheet {
  id: string;
  factoryId: string;
  productionDate: string; // 'YYYY-MM-DD'
  shift: ShiftType;
  shiftStart: string; // ISO
  shiftEnd: string; // ISO
  shiftDurationHours: number;
  entries: ProductionEntry[];
  totalProductionMeters: number;
  runningMachineCount: number;
  stoppedMachineCount: number;
  maintenanceMachineCount: number;
  averageEfficiency: number | null;
  notes?: string;
  status: ProductionSheetStatus;
  createdBy: string;
  updatedBy: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveProductionEntryInput {
  machineId: string;
  actualProductionMeters: number;
  efficiencyMode: EfficiencyMode;
  efficiencyPercent?: number | null;
  notes?: string;
}

export interface SaveProductionSheetInput {
  productionDate: string; // 'YYYY-MM-DD'
  shift: ShiftType;
  entries: SaveProductionEntryInput[];
  notes?: string;
  status?: ProductionSheetStatus;
}
