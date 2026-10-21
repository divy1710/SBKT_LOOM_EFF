export type AnalyticsShift = 'ALL' | 'DAY' | 'NIGHT';

export interface SmartInsight {
  id: string;
  type: 'TREND_UP' | 'TREND_DOWN' | 'SHIFT_COMPARE' | 'TOP_FABRIC' | 'TOP_MACHINE' | 'ANOMALY' | 'INFO';
  title: string;
  description: string;
  metric?: string;
}

export interface ProductionSummaryData {
  periodProduction: number;
  previousPeriodProduction: number;
  percentageChange: number | null;
  weekProduction: number;
  monthProduction: number;
  avgDailyProduction: number;
  distinctDaysCount: number;
  totalSheets: number;
  bestDay: { date: string; meters: number } | null;
  lowestDay: { date: string; meters: number } | null;
  bestMachine: { machineNumber: string; fabricName: string; meters: number } | null;
  insights: SmartInsight[];
  comparisonPeriod: {
    startDate: string;
    endDate: string;
  };
}

export interface ProductionTrendItem {
  date: string;
  dayMeters: number;
  nightMeters: number;
  totalMeters: number;
  runningMachines: number;
  averageEfficiency: number | null;
}

export interface MachineAnalyticsData {
  currentConfig: {
    machineNumber: string;
    name: string;
    status: string;
    rpm: number;
    ppi: number;
    fabricName: string;
    fabricCode: string;
  };
  totalProductionMeters: number;
  recordCount: number;
  distinctDaysCount: number;
  avgDailyProduction: number;
  avgDayShiftProduction: number;
  avgNightShiftProduction: number;
  avgCombinedDailyProduction: number;
  bestDay: { date: string; meters: number } | null;
  lowestDay: { date: string; meters: number } | null;
  trend: Array<{
    date: string;
    dayMeters: number;
    nightMeters: number;
    totalMeters: number;
    fabricName: string;
    efficiencyPercent: number | null;
    rpm: number;
    ppi: number;
  }>;
}

export interface FabricQualityItem {
  fabricName: string;
  fabricCode: string;
  totalProductionMeters: number;
  percentageShare: number;
  entriesCount: number;
  avgProductionPerEntry: number;
}

export interface FabricQualityAnalyticsData {
  grandTotalProduction: number;
  fabricsCount: number;
  topFabric: FabricQualityItem | null;
  fabrics: FabricQualityItem[];
}

export interface MachinePerformanceItem {
  rank: number;
  machineId: string;
  machineNumber: string;
  fabricName: string;
  totalProductionMeters: number;
  entriesCount: number;
  avgProductionPerShift: number;
  deficitMeters?: number;
}

export interface MachinePerformanceData {
  top5: MachinePerformanceItem[];
  bottom5: MachinePerformanceItem[];
  totalActiveMachines: number;
  recordedMachinesCount: number;
  unrecordedMachinesCount: number;
  threshold: number;
  thresholdType: 'AVERAGE' | 'TOTAL';
  belowThreshold: MachinePerformanceItem[];
  comparison: MachinePerformanceItem[];
}

export interface EfficiencySummaryData {
  overallAvgEfficiency: number | null;
  overallEntriesCount: number;
  dayAvgEfficiency: number | null;
  dayEntriesCount: number;
  nightAvgEfficiency: number | null;
  nightEntriesCount: number;
  autoCount: number;
  manualCount: number;
  distribution: {
    below70: number;
    between70And84: number;
    above85: number;
    total: number;
  };
}

export interface MachineEfficiencyTrendPoint {
  date: string;
  shift: string;
  efficiencyPercent: number | null;
  efficiencyMode: string;
  actualMeters: number;
  theoreticalMeters: number | null;
  rpm: number;
  ppi: number;
  fabricName: string;
}

export interface MachineEfficiencyTrendData {
  points: MachineEfficiencyTrendPoint[];
  combinedDaily: Array<{
    date: string;
    dayEfficiency: number | null;
    nightEfficiency: number | null;
    combinedEfficiency: number | null;
  }>;
}

export interface MachineEfficiencyDetailRow {
  productionDate: string;
  shift: string;
  fabricQuality: string;
  fabricCode?: string;
  actualProductionMeters: number;
  efficiencyPercent: number | null;
  efficiencyMode: string;
  rpmSnapshot: number;
  ppiSnapshot: number;
  theoreticalProductionMeters: number | null;
  machineStatusSnapshot: string;
  notes?: string;
}

export interface EfficiencyRankingItem {
  rank: number;
  machineId: string;
  machineNumber: string;
  avgEfficiency: number;
  dayAvgEfficiency: number | null;
  nightAvgEfficiency: number | null;
  validEntriesCount: number;
}

export interface EfficiencyRankingData {
  ranking: EfficiencyRankingItem[];
  totalActiveLooms: number;
  recordedLoomsCount: number;
  missingDataLoomsCount: number;
  missingDataMachines: Array<{ machineId: string; machineNumber: string; name: string }>;
  minEfficiencyThreshold: number;
  belowThreshold: EfficiencyRankingItem[];
}
