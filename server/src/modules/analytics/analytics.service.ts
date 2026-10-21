import { Types, PipelineStage } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { IUser, UserRole } from '../user/user.model';
import { Machine } from '../machine/machine.model';
import { ProductionSheet, ShiftType } from '../production/production.model';
import { normalizeProductionDate } from '../production/production.utils';
import {
  BaseAnalyticsQuery,
  MachineAnalyticsQuery,
  MachinePerformanceQuery,
  EfficiencyRankingQuery,
  MachineEfficiencyDetailsQuery,
  AnalyticsShiftFilter,
} from './analytics.validation';

export interface SmartInsight {
  id: string;
  type: 'TREND_UP' | 'TREND_DOWN' | 'SHIFT_COMPARE' | 'TOP_FABRIC' | 'TOP_MACHINE' | 'ANOMALY' | 'INFO';
  title: string;
  description: string;
  metric?: string;
}

export class AnalyticsService {
  // ─── Resolve Effective Factory ID ──────────────────────────────────────────
  public static resolveFactoryId(actor: IUser, explicitFactoryId?: string): Types.ObjectId {
    if (actor.role === UserRole.SUPER_ADMIN) {
      if (explicitFactoryId) {
        if (!Types.ObjectId.isValid(explicitFactoryId)) {
          throw new ApiError(400, 'Invalid factoryId format');
        }
        return new Types.ObjectId(explicitFactoryId);
      }
      if (actor.factoryId) {
        return actor.factoryId;
      }
      throw new ApiError(400, 'Super admin must specify factoryId context for analytics');
    }

    if (!actor.factoryId) {
      throw new ApiError(403, 'User is not assigned to a factory');
    }

    return actor.factoryId;
  }

  // ─── 1. Production Analysis Summary ─────────────────────────────────────────
  static async getProductionSummary(actor: IUser, query: BaseAnalyticsQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);

    const shiftMatch: Record<string, unknown> = {};
    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      shiftMatch.shift = query.shift;
    }

    // 1. Current Period Production
    const periodSheets = await ProductionSheet.find({
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
      ...shiftMatch,
    }).lean();

    let periodProduction = 0;
    const dateMap = new Map<string, number>();
    const shiftMetersMap = { DAY: 0, NIGHT: 0 };
    const machineMetersMap = new Map<string, { machineNumber: string; meters: number; fabricName: string }>();
    const fabricMetersMap = new Map<string, number>();

    for (const sheet of periodSheets) {
      periodProduction += sheet.totalProductionMeters || 0;
      const dStr = sheet.productionDate.toISOString().split('T')[0];
      dateMap.set(dStr, (dateMap.get(dStr) || 0) + (sheet.totalProductionMeters || 0));

      if (sheet.shift === ShiftType.DAY) {
        shiftMetersMap.DAY += sheet.totalProductionMeters || 0;
      } else if (sheet.shift === ShiftType.NIGHT) {
        shiftMetersMap.NIGHT += sheet.totalProductionMeters || 0;
      }

      for (const entry of sheet.entries || []) {
        const mKey = entry.machineNumberSnapshot;
        const currentM = machineMetersMap.get(mKey) || {
          machineNumber: mKey,
          meters: 0,
          fabricName: entry.fabricNameSnapshot || '',
        };
        currentM.meters += entry.actualProductionMeters || 0;
        machineMetersMap.set(mKey, currentM);

        const fName = entry.fabricNameSnapshot || 'Unassigned';
        fabricMetersMap.set(fName, (fabricMetersMap.get(fName) || 0) + (entry.actualProductionMeters || 0));
      }
    }

    // 2. Previous Comparable Period Production
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

    const prevSheets = await ProductionSheet.find({
      factoryId,
      productionDate: { $gte: prevStartDate, $lte: prevEndDate },
      ...shiftMatch,
    }).select('totalProductionMeters');

    const previousPeriodProduction = prevSheets.reduce((sum, s) => sum + (s.totalProductionMeters || 0), 0);

    const percentageChange =
      previousPeriodProduction > 0
        ? Number((((periodProduction - previousPeriodProduction) / previousPeriodProduction) * 100).toFixed(1))
        : null;

    // 3. Current Week & Current Month
    const now = new Date();
    // Monday of current week (UTC)
    const dayOfWeek = now.getUTCDay() || 7;
    const weekStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek + 1));
    const monthStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [weekSheets, monthSheets] = await Promise.all([
      ProductionSheet.find({
        factoryId,
        productionDate: { $gte: weekStartDate },
        ...shiftMatch,
      }).select('totalProductionMeters'),
      ProductionSheet.find({
        factoryId,
        productionDate: { $gte: monthStartDate },
        ...shiftMatch,
      }).select('totalProductionMeters'),
    ]);

    const weekProduction = weekSheets.reduce((sum, s) => sum + (s.totalProductionMeters || 0), 0);
    const monthProduction = monthSheets.reduce((sum, s) => sum + (s.totalProductionMeters || 0), 0);

    // 4. Best & Lowest Days
    let bestDay: { date: string; meters: number } | null = null;
    let lowestDay: { date: string; meters: number } | null = null;

    for (const [dStr, meters] of dateMap.entries()) {
      const roundedMeters = Number(meters.toFixed(1));
      if (!bestDay || roundedMeters > bestDay.meters) {
        bestDay = { date: dStr, meters: roundedMeters };
      }
      if (!lowestDay || roundedMeters < lowestDay.meters) {
        lowestDay = { date: dStr, meters: roundedMeters };
      }
    }

    // 5. Best Machine
    let bestMachine: { machineNumber: string; fabricName: string; meters: number } | null = null;
    for (const m of machineMetersMap.values()) {
      const rounded = Number(m.meters.toFixed(1));
      if (!bestMachine || rounded > bestMachine.meters) {
        bestMachine = { machineNumber: m.machineNumber, fabricName: m.fabricName, meters: rounded };
      }
    }

    const distinctDaysCount = dateMap.size;
    const avgDailyProduction =
      distinctDaysCount > 0 ? Number((periodProduction / distinctDaysCount).toFixed(1)) : 0;

    // 6. Smart Insights Generation
    const insights: SmartInsight[] = [];

    if (distinctDaysCount > 0) {
      if (percentageChange !== null) {
        if (percentageChange > 0) {
          insights.push({
            id: 'ins-trend-up',
            type: 'TREND_UP',
            title: `Production Increased by ${percentageChange}%`,
            description: `Output rose to ${periodProduction.toLocaleString('en-IN')} m compared with ${previousPeriodProduction.toLocaleString('en-IN')} m in the previous equivalent period.`,
            metric: `+${percentageChange}%`,
          });
        } else if (percentageChange < 0) {
          insights.push({
            id: 'ins-trend-down',
            type: 'TREND_DOWN',
            title: `Production Decreased by ${Math.abs(percentageChange)}%`,
            description: `Output dropped by ${Math.abs(percentageChange)}% compared with the previous equivalent period (${previousPeriodProduction.toLocaleString('en-IN')} m).`,
            metric: `${percentageChange}%`,
          });
        }
      }

      // Shift distribution insight
      const totalShift = shiftMetersMap.DAY + shiftMetersMap.NIGHT;
      if (totalShift > 0 && query.shift === AnalyticsShiftFilter.ALL) {
        const dayPct = Math.round((shiftMetersMap.DAY / totalShift) * 100);
        const nightPct = 100 - dayPct;
        insights.push({
          id: 'ins-shift-split',
          type: 'SHIFT_COMPARE',
          title: `Shift Production Share: Day ${dayPct}% vs Night ${nightPct}%`,
          description: `Day shift contributed ${shiftMetersMap.DAY.toLocaleString('en-IN')} m (${dayPct}%) while Night shift contributed ${shiftMetersMap.NIGHT.toLocaleString('en-IN')} m (${nightPct}%).`,
        });
      }

      // Top Fabric insight
      if (fabricMetersMap.size > 0 && periodProduction > 0) {
        let topFab = '';
        let topFabMeters = 0;
        for (const [f, m] of fabricMetersMap.entries()) {
          if (m > topFabMeters) {
            topFabMeters = m;
            topFab = f;
          }
        }
        const fabShare = Number(((topFabMeters / periodProduction) * 100).toFixed(1));
        if (fabShare >= 20) {
          insights.push({
            id: 'ins-top-fabric',
            type: 'TOP_FABRIC',
            title: `${topFab} Dominates with ${fabShare}% of Total Volume`,
            description: `Quality "${topFab}" accounted for ${topFabMeters.toLocaleString('en-IN')} m across all recorded shifts in this period.`,
            metric: `${fabShare}%`,
          });
        }
      }

      // Top Machine insight
      if (bestMachine && periodProduction > 0) {
        const mShare = Number(((bestMachine.meters / periodProduction) * 100).toFixed(1));
        insights.push({
          id: 'ins-top-machine',
          type: 'TOP_MACHINE',
          title: `Top Performer: Loom ${bestMachine.machineNumber}`,
          description: `Machine ${bestMachine.machineNumber} produced ${bestMachine.meters.toLocaleString('en-IN')} m (${mShare}% of total output) running quality ${bestMachine.fabricName}.`,
        });
      }
    }

    return {
      periodProduction: Number(periodProduction.toFixed(1)),
      previousPeriodProduction: Number(previousPeriodProduction.toFixed(1)),
      percentageChange,
      weekProduction: Number(weekProduction.toFixed(1)),
      monthProduction: Number(monthProduction.toFixed(1)),
      avgDailyProduction,
      distinctDaysCount,
      totalSheets: periodSheets.length,
      bestDay,
      lowestDay,
      bestMachine,
      insights,
      comparisonPeriod: {
        startDate: prevStartDate.toISOString().split('T')[0],
        endDate: prevEndDate.toISOString().split('T')[0],
      },
    };
  }

  // ─── 2. Production Trend Graph ──────────────────────────────────────────────
  static async getProductionTrend(actor: IUser, query: BaseAnalyticsQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);

    const matchStage: Record<string, unknown> = {
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
    };

    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      matchStage.shift = query.shift;
    }

    const sheets = await ProductionSheet.find(matchStage)
      .sort({ productionDate: 1, shift: 1 })
      .lean();

    const dailyMap = new Map<
      string,
      {
        date: string;
        dayMeters: number;
        nightMeters: number;
        totalMeters: number;
        runningMachines: number;
        efficiencies: number[];
      }
    >();

    for (const s of sheets) {
      const dStr = s.productionDate.toISOString().split('T')[0];
      const current = dailyMap.get(dStr) || {
        date: dStr,
        dayMeters: 0,
        nightMeters: 0,
        totalMeters: 0,
        runningMachines: 0,
        efficiencies: [],
      };

      const meters = s.totalProductionMeters || 0;
      if (s.shift === ShiftType.DAY) {
        current.dayMeters += meters;
      } else {
        current.nightMeters += meters;
      }
      current.totalMeters += meters;
      current.runningMachines = Math.max(current.runningMachines, s.runningMachineCount || 0);

      if (typeof s.averageEfficiency === 'number') {
        current.efficiencies.push(s.averageEfficiency);
      }
      dailyMap.set(dStr, current);
    }

    const trend = Array.from(dailyMap.values()).map((item) => ({
      date: item.date,
      dayMeters: Number(item.dayMeters.toFixed(1)),
      nightMeters: Number(item.nightMeters.toFixed(1)),
      totalMeters: Number(item.totalMeters.toFixed(1)),
      runningMachines: item.runningMachines,
      averageEfficiency:
        item.efficiencies.length > 0
          ? Number((item.efficiencies.reduce((a, b) => a + b, 0) / item.efficiencies.length).toFixed(2))
          : null,
    }));

    return trend;
  }

  // ─── 3. Machine Analytics ───────────────────────────────────────────────────
  static async getMachineAnalytics(actor: IUser, query: MachineAnalyticsQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);
    const machineId = new Types.ObjectId(query.machineId);

    // 1. Fetch current machine configuration
    const machine = await Machine.findOne({ _id: machineId, factoryId }).populate('fabricId');
    if (!machine) {
      throw new ApiError(404, 'Machine not found in this factory');
    }

    const currentFabric = machine.fabricId as unknown as { name?: string; code?: string } | undefined;
    const currentConfig = {
      machineNumber: machine.machineNumber,
      name: machine.name,
      status: machine.status,
      rpm: machine.rpm,
      ppi: machine.ppi,
      fabricName: currentFabric?.name || 'Unassigned',
      fabricCode: currentFabric?.code || '',
    };

    // 2. Fetch production records for this machine
    const shiftMatch: Record<string, unknown> = {};
    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      shiftMatch.shift = query.shift;
    }

    const sheets = await ProductionSheet.find({
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
      'entries.machineId': machineId,
      ...shiftMatch,
    }).lean();

    let totalProductionMeters = 0;
    let dayMetersTotal = 0;
    let dayCount = 0;
    let nightMetersTotal = 0;
    let nightCount = 0;

    const dailyCombinedMap = new Map<
      string,
      {
        date: string;
        dayMeters: number;
        nightMeters: number;
        totalMeters: number;
        fabricName: string;
        efficiencyPercent: number | null;
        rpm: number;
        ppi: number;
      }
    >();

    for (const sheet of sheets) {
      const entry = sheet.entries.find((e) => e.machineId.toString() === query.machineId);
      if (!entry) continue;

      const dStr = sheet.productionDate.toISOString().split('T')[0];
      const m = entry.actualProductionMeters || 0;
      totalProductionMeters += m;

      if (sheet.shift === ShiftType.DAY) {
        dayMetersTotal += m;
        dayCount++;
      } else {
        nightMetersTotal += m;
        nightCount++;
      }

      const curDay = dailyCombinedMap.get(dStr) || {
        date: dStr,
        dayMeters: 0,
        nightMeters: 0,
        totalMeters: 0,
        fabricName: entry.fabricNameSnapshot || '',
        efficiencyPercent: entry.efficiencyPercent,
        rpm: entry.rpmSnapshot || machine.rpm,
        ppi: entry.ppiSnapshot || machine.ppi,
      };

      if (sheet.shift === ShiftType.DAY) {
        curDay.dayMeters += m;
      } else {
        curDay.nightMeters += m;
      }
      curDay.totalMeters += m;
      dailyCombinedMap.set(dStr, curDay);
    }

    const distinctDaysCount = dailyCombinedMap.size;
    const avgDailyProduction =
      distinctDaysCount > 0 ? Number((totalProductionMeters / distinctDaysCount).toFixed(1)) : 0;
    const avgDayShiftProduction = dayCount > 0 ? Number((dayMetersTotal / dayCount).toFixed(1)) : 0;
    const avgNightShiftProduction = nightCount > 0 ? Number((nightMetersTotal / nightCount).toFixed(1)) : 0;

    // Combined daily production: Sum of Day + Night grouped by date / distinct dates
    const avgCombinedDailyProduction =
      distinctDaysCount > 0
        ? Number(
            (
              Array.from(dailyCombinedMap.values()).reduce((sum, d) => sum + d.totalMeters, 0) /
              distinctDaysCount
            ).toFixed(1),
          )
        : 0;

    // Best & Lowest Day for this machine
    let bestDay: { date: string; meters: number } | null = null;
    let lowestDay: { date: string; meters: number } | null = null;

    for (const d of dailyCombinedMap.values()) {
      const rounded = Number(d.totalMeters.toFixed(1));
      if (!bestDay || rounded > bestDay.meters) {
        bestDay = { date: d.date, meters: rounded };
      }
      if (!lowestDay || rounded < lowestDay.meters) {
        lowestDay = { date: d.date, meters: rounded };
      }
    }

    const trend = Array.from(dailyCombinedMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      currentConfig,
      totalProductionMeters: Number(totalProductionMeters.toFixed(1)),
      recordCount: dayCount + nightCount,
      distinctDaysCount,
      avgDailyProduction,
      avgDayShiftProduction,
      avgNightShiftProduction,
      avgCombinedDailyProduction,
      bestDay,
      lowestDay,
      trend,
    };
  }

  // ─── 4. Fabric Quality Analytics ────────────────────────────────────────────
  static async getFabricQualityAnalytics(actor: IUser, query: BaseAnalyticsQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);

    const matchStage: Record<string, unknown> = {
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
    };

    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      matchStage.shift = query.shift;
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $unwind: '$entries' },
      {
        $group: {
          _id: '$entries.fabricNameSnapshot',
          fabricCode: { $first: '$entries.fabricCodeSnapshot' },
          totalProductionMeters: { $sum: '$entries.actualProductionMeters' },
          entriesCount: { $sum: 1 },
        },
      },
      { $sort: { totalProductionMeters: -1 } },
    ];

    const results = await ProductionSheet.aggregate(pipeline);

    const grandTotal = results.reduce((sum, r) => sum + (r.totalProductionMeters || 0), 0);

    const fabrics = results.map((r) => {
      const meters = Number((r.totalProductionMeters || 0).toFixed(1));
      const percentageShare = grandTotal > 0 ? Number(((meters / grandTotal) * 100).toFixed(1)) : 0;
      const avgPerEntry = r.entriesCount > 0 ? Number((meters / r.entriesCount).toFixed(1)) : 0;

      return {
        fabricName: r._id || 'Unassigned',
        fabricCode: r.fabricCode || '',
        totalProductionMeters: meters,
        percentageShare,
        entriesCount: r.entriesCount,
        avgProductionPerEntry: avgPerEntry,
      };
    });

    return {
      grandTotalProduction: Number(grandTotal.toFixed(1)),
      fabricsCount: fabrics.length,
      topFabric: fabrics.length > 0 ? fabrics[0] : null,
      fabrics,
    };
  }

  // ─── 5. Machine Performance Analytics ───────────────────────────────────────
  static async getMachinePerformance(actor: IUser, query: MachinePerformanceQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);

    // 1. Get all active factory machines
    const allActiveMachines = await Machine.find({ factoryId, isActive: true }).select('machineNumber name');
    const totalActiveCount = allActiveMachines.length;

    const matchStage: Record<string, unknown> = {
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
    };

    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      matchStage.shift = query.shift;
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $unwind: '$entries' },
      {
        $group: {
          _id: '$entries.machineId',
          machineNumber: { $first: '$entries.machineNumberSnapshot' },
          fabricName: { $first: '$entries.fabricNameSnapshot' },
          totalProductionMeters: { $sum: '$entries.actualProductionMeters' },
          entriesCount: { $sum: 1 },
        },
      },
      { $sort: { totalProductionMeters: -1 } },
    ];

    const results = await ProductionSheet.aggregate(pipeline);

    const recordedMachineIds = new Set(results.map((r) => r._id.toString()));
    const unrecordedMachinesCount = Math.max(0, totalActiveCount - recordedMachineIds.size);

    const formattedList = results.map((r) => {
      const total = Number((r.totalProductionMeters || 0).toFixed(1));
      const avgPerShift = r.entriesCount > 0 ? Number((total / r.entriesCount).toFixed(1)) : 0;
      return {
        machineId: r._id.toString(),
        machineNumber: r.machineNumber,
        fabricName: r.fabricName || 'Unassigned',
        totalProductionMeters: total,
        entriesCount: r.entriesCount,
        avgProductionPerShift: avgPerShift,
      };
    });

    // Top 5 machines
    const top5 = formattedList.slice(0, 5).map((m, idx) => ({ rank: idx + 1, ...m }));

    // Bottom 5 machines (from machines with records)
    const reversed = [...formattedList].reverse();
    const bottom5 = reversed.slice(0, 5).map((m, idx) => ({ rank: formattedList.length - idx, ...m }));

    // Below threshold filter (default threshold applies to avgProductionPerShift)
    const thresholdVal = query.threshold;
    const belowThreshold = formattedList
      .filter((m) =>
        query.thresholdType === 'TOTAL'
          ? m.totalProductionMeters < thresholdVal
          : m.avgProductionPerShift < thresholdVal,
      )
      .map((m) => ({
        ...m,
        deficitMeters: Number(
          (
            thresholdVal -
            (query.thresholdType === 'TOTAL' ? m.totalProductionMeters : m.avgProductionPerShift)
          ).toFixed(1),
        ),
      }));

    return {
      top5,
      bottom5,
      totalActiveMachines: totalActiveCount,
      recordedMachinesCount: recordedMachineIds.size,
      unrecordedMachinesCount,
      threshold: thresholdVal,
      thresholdType: query.thresholdType,
      belowThreshold,
      comparison: formattedList, // full list for comparison bar chart
    };
  }

  // ─── 6. Efficiency Summary Analytics ───────────────────────────────────────
  static async getEfficiencySummary(actor: IUser, query: BaseAnalyticsQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);

    const matchStage: Record<string, unknown> = {
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
    };

    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      matchStage.shift = query.shift;
    }

    const sheets = await ProductionSheet.find(matchStage).lean();

    const overallEfficiencies: number[] = [];
    const dayEfficiencies: number[] = [];
    const nightEfficiencies: number[] = [];

    let autoCount = 0;
    let manualCount = 0;

    let below70 = 0;
    let between70And84 = 0;
    let above85 = 0;

    for (const s of sheets) {
      for (const e of s.entries || []) {
        if (typeof e.efficiencyPercent === 'number' && isFinite(e.efficiencyPercent)) {
          const eff = e.efficiencyPercent;
          overallEfficiencies.push(eff);

          if (s.shift === ShiftType.DAY) {
            dayEfficiencies.push(eff);
          } else {
            nightEfficiencies.push(eff);
          }

          if (e.efficiencyMode === 'MANUAL') {
            manualCount++;
          } else {
            autoCount++;
          }

          if (eff < 70) below70++;
          else if (eff < 85) between70And84++;
          else above85++;
        }
      }
    }

    const calcAvg = (arr: number[]) =>
      arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

    return {
      overallAvgEfficiency: calcAvg(overallEfficiencies),
      overallEntriesCount: overallEfficiencies.length,
      dayAvgEfficiency: calcAvg(dayEfficiencies),
      dayEntriesCount: dayEfficiencies.length,
      nightAvgEfficiency: calcAvg(nightEfficiencies),
      nightEntriesCount: nightEfficiencies.length,
      autoCount,
      manualCount,
      distribution: {
        below70,
        between70And84,
        above85,
        total: overallEfficiencies.length,
      },
    };
  }

  // ─── 7. Machine Efficiency Trend ────────────────────────────────────────────
  static async getMachineEfficiencyTrend(actor: IUser, query: MachineAnalyticsQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);
    const machineId = new Types.ObjectId(query.machineId);

    const shiftMatch: Record<string, unknown> = {};
    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      shiftMatch.shift = query.shift;
    }

    const sheets = await ProductionSheet.find({
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
      'entries.machineId': machineId,
      ...shiftMatch,
    })
      .sort({ productionDate: 1, shift: 1 })
      .lean();

    const points: Array<{
      date: string;
      shift: string;
      efficiencyPercent: number | null;
      efficiencyMode: string;
      actualMeters: number;
      theoreticalMeters: number | null;
      rpm: number;
      ppi: number;
      fabricName: string;
    }> = [];

    // Also group by date for combined calculation: sum(actual) / sum(theoretical) * 100 for AUTO entries
    const dailyAutoMap = new Map<
      string,
      { actual: number; theoretical: number; dayEff: number | null; nightEff: number | null }
    >();

    for (const sheet of sheets) {
      const entry = sheet.entries.find((e) => e.machineId.toString() === query.machineId);
      if (!entry) continue;

      const dStr = sheet.productionDate.toISOString().split('T')[0];

      points.push({
        date: dStr,
        shift: sheet.shift,
        efficiencyPercent: entry.efficiencyPercent,
        efficiencyMode: entry.efficiencyMode,
        actualMeters: entry.actualProductionMeters,
        theoreticalMeters: entry.theoreticalProductionMeters,
        rpm: entry.rpmSnapshot,
        ppi: entry.ppiSnapshot,
        fabricName: entry.fabricNameSnapshot,
      });

      const curDay = dailyAutoMap.get(dStr) || { actual: 0, theoretical: 0, dayEff: null, nightEff: null };
      if (entry.efficiencyMode === 'AUTO' && entry.theoreticalProductionMeters && entry.theoreticalProductionMeters > 0) {
        curDay.actual += entry.actualProductionMeters;
        curDay.theoretical += entry.theoreticalProductionMeters;
      }
      if (sheet.shift === ShiftType.DAY) curDay.dayEff = entry.efficiencyPercent;
      else curDay.nightEff = entry.efficiencyPercent;

      dailyAutoMap.set(dStr, curDay);
    }

    const combinedDaily = Array.from(dailyAutoMap.entries()).map(([date, d]) => {
      let combinedEff: number | null = null;
      if (d.theoretical > 0) {
        combinedEff = Number(((d.actual / d.theoretical) * 100).toFixed(2));
      }
      return {
        date,
        dayEfficiency: d.dayEff,
        nightEfficiency: d.nightEff,
        combinedEfficiency: combinedEff,
      };
    });

    return {
      points,
      combinedDaily,
    };
  }

  // ─── 8. Machine Detailed Efficiency Table ───────────────────────────────────
  static async getMachineEfficiencyDetails(actor: IUser, query: MachineEfficiencyDetailsQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);
    const machineId = new Types.ObjectId(query.machineId);

    const shiftMatch: Record<string, unknown> = {};
    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      shiftMatch.shift = query.shift;
    }

    const sheets = await ProductionSheet.find({
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
      'entries.machineId': machineId,
      ...shiftMatch,
    })
      .sort({ productionDate: -1, shift: 1 })
      .lean();

    const allEntries: Array<{
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
    }> = [];

    for (const sheet of sheets) {
      const entry = sheet.entries.find((e) => e.machineId.toString() === query.machineId);
      if (!entry) continue;

      allEntries.push({
        productionDate: sheet.productionDate.toISOString().split('T')[0],
        shift: sheet.shift,
        fabricQuality: entry.fabricNameSnapshot,
        fabricCode: entry.fabricCodeSnapshot,
        actualProductionMeters: entry.actualProductionMeters,
        efficiencyPercent: entry.efficiencyPercent,
        efficiencyMode: entry.efficiencyMode,
        rpmSnapshot: entry.rpmSnapshot,
        ppiSnapshot: entry.ppiSnapshot,
        theoreticalProductionMeters: entry.theoreticalProductionMeters,
        machineStatusSnapshot: entry.machineStatusSnapshot,
        notes: entry.notes,
      });
    }

    // Sort in memory
    const sortKey = query.sortBy;
    const isAsc = query.sortOrder === 'asc';
    allEntries.sort((a, b) => {
      let va = a[sortKey as keyof typeof a];
      let vb = b[sortKey as keyof typeof b];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') {
        return isAsc ? (va as string).localeCompare(vb as string) : (vb as string).localeCompare(va as string);
      }
      return isAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    const page = query.page;
    const limit = query.limit;
    const totalItems = allEntries.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paginated = allEntries.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  // ─── 9. Machine Efficiency Ranking ──────────────────────────────────────────
  static async getEfficiencyRanking(actor: IUser, query: EfficiencyRankingQuery) {
    const factoryId = this.resolveFactoryId(actor, query.factoryId);
    const startDate = normalizeProductionDate(query.startDate);
    const endDate = normalizeProductionDate(query.endDate);

    // 1. All active machines for missing-data tracking
    const allActiveMachines = await Machine.find({ factoryId, isActive: true }).select('machineNumber name');
    const totalActiveLooms = allActiveMachines.length;

    const matchStage: Record<string, unknown> = {
      factoryId,
      productionDate: { $gte: startDate, $lte: endDate },
    };

    if (query.shift && query.shift !== AnalyticsShiftFilter.ALL) {
      matchStage.shift = query.shift;
    }

    const sheets = await ProductionSheet.find(matchStage).lean();

    const machineEffMap = new Map<
      string,
      {
        machineId: string;
        machineNumber: string;
        allEff: number[];
        dayEff: number[];
        nightEff: number[];
      }
    >();

    for (const sheet of sheets) {
      for (const entry of sheet.entries || []) {
        if (typeof entry.efficiencyPercent === 'number' && isFinite(entry.efficiencyPercent)) {
          const mId = entry.machineId.toString();
          const cur = machineEffMap.get(mId) || {
            machineId: mId,
            machineNumber: entry.machineNumberSnapshot,
            allEff: [],
            dayEff: [],
            nightEff: [],
          };

          cur.allEff.push(entry.efficiencyPercent);
          if (sheet.shift === ShiftType.DAY) {
            cur.dayEff.push(entry.efficiencyPercent);
          } else {
            cur.nightEff.push(entry.efficiencyPercent);
          }
          machineEffMap.set(mId, cur);
        }
      }
    }

    const calcAvg = (arr: number[]) =>
      arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

    const ranking = Array.from(machineEffMap.values()).map((m) => {
      const avgEfficiency = calcAvg(m.allEff)!;
      const dayAvgEfficiency = calcAvg(m.dayEff);
      const nightAvgEfficiency = calcAvg(m.nightEff);

      return {
        machineId: m.machineId,
        machineNumber: m.machineNumber,
        avgEfficiency,
        dayAvgEfficiency,
        nightAvgEfficiency,
        validEntriesCount: m.allEff.length,
      };
    });

    // Sort by requested sort column
    const sortField = query.sortBy;
    const isAsc = query.sortOrder === 'asc';
    ranking.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string') {
        return isAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return isAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    // Add rank
    const rankedList = ranking.map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    // Filter below minimum efficiency threshold
    const minThreshold = query.minEfficiencyThreshold;
    const belowThreshold = rankedList.filter((m) => m.avgEfficiency < minThreshold);

    // Identify active machines with missing data
    const recordedIds = new Set(machineEffMap.keys());
    const missingDataMachines = allActiveMachines
      .filter((m) => !recordedIds.has(m._id.toString()))
      .map((m) => ({
        machineId: m._id.toString(),
        machineNumber: m.machineNumber,
        name: m.name,
      }));

    return {
      ranking: rankedList,
      totalActiveLooms,
      recordedLoomsCount: rankedList.length,
      missingDataLoomsCount: missingDataMachines.length,
      missingDataMachines,
      minEfficiencyThreshold: minThreshold,
      belowThreshold,
    };
  }
}
