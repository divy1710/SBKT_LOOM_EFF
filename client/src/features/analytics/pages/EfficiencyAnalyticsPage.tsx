import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Percent,
  AlertCircle,
  Loader2,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Cpu,
  Filter,
  AlertTriangle,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { AnalyticsHeader } from '../components/AnalyticsHeader';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsPdfService } from '../services/analyticsPdf.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ActiveMachineOption } from '../services/analytics.service';
import type {
  AnalyticsShift,
  EfficiencySummaryData,
  MachineEfficiencyTrendData,
  MachineEfficiencyDetailRow,
  EfficiencyRankingData,
} from '../types/analytics.types';
import {
  formatFriendlyDate,
  getEfficiencyBadgeColor,
} from '@/features/production/utils/production-calc';

export const EfficiencyAnalyticsPage: React.FC = () => {
  const { user } = useAuth();

  const defaultDates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    return { start: fmt(start), end: fmt(end) };
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  const [shift, setShift] = useState<AnalyticsShift>('ALL');
  const [minThreshold, setMinThreshold] = useState<number>(85);

  const [machines, setMachines] = useState<ActiveMachineOption[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');

  // Data states
  const [summary, setSummary] = useState<EfficiencySummaryData | null>(null);
  const [trend, setTrend] = useState<MachineEfficiencyTrendData | null>(null);
  const [ranking, setRanking] = useState<EfficiencyRankingData | null>(null);

  // Detailed Table modal/toggle
  const [showDetailedTable, setShowDetailedTable] = useState<boolean>(false);
  const [detailedRows, setDetailedRows] = useState<MachineEfficiencyDetailRow[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // General loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PDF Export states
  const [isExportingSummaryPdf, setIsExportingSummaryPdf] = useState<boolean>(false);
  const [isExportingDetailedPdf, setIsExportingDetailedPdf] = useState<boolean>(false);

  // Load machines
  useEffect(() => {
    const initMachines = async () => {
      try {
        const list = await AnalyticsService.getActiveMachines();
        setMachines(list);
        if (list.length > 0) {
          setSelectedMachineId(list[0].id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load machines';
        toast.error(msg);
      }
    };
    void initMachines();
  }, []);

  // Load primary data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, rankData] = await Promise.all([
        AnalyticsService.getEfficiencySummary({ startDate, endDate, shift }),
        AnalyticsService.getEfficiencyRanking({
          startDate,
          endDate,
          shift,
          minEfficiencyThreshold: minThreshold,
        }),
      ]);
      setSummary(sumData);
      setRanking(rankData);

      if (selectedMachineId) {
        const trendData = await AnalyticsService.getMachineEfficiencyTrend({
          machineId: selectedMachineId,
          startDate,
          endDate,
          shift,
        });
        setTrend(trendData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load efficiency analytics';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, shift, minThreshold, selectedMachineId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Load detailed entries table when requested
  const handleToggleDetailed = async () => {
    if (!showDetailedTable) {
      if (!selectedMachineId) return;
      setLoadingDetails(true);
      try {
        const res = await AnalyticsService.getMachineEfficiencyDetails({
          machineId: selectedMachineId,
          startDate,
          endDate,
          shift,
          limit: 100,
        });
        setDetailedRows(res.items);
        setShowDetailedTable(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load detailed records';
        toast.error(msg);
      } finally {
        setLoadingDetails(false);
      }
    } else {
      setShowDetailedTable(false);
    }
  };

  const selectedMachine = machines.find((m) => m.id === selectedMachineId);
  const selectedLoomNumber = selectedMachine ? selectedMachine.machineNumber : undefined;

  const handleExportSummaryPdf = async () => {
    if (!summary || !ranking) {
      toast.error('No efficiency analytics data available to export');
      return;
    }

    setIsExportingSummaryPdf(true);
    try {
      const chartImage = await AnalyticsPdfService.captureChart('efficiency-trend-chart');
      AnalyticsPdfService.exportEfficiencySummary({
        summary,
        ranking: ranking.ranking,
        belowThreshold: ranking.belowThreshold,
        minThreshold,
        selectedMachineNumber: selectedLoomNumber,
        chartImage,
        startDate,
        endDate,
        shift,
        factoryName: user?.factoryName,
        factoryTimezone: user?.factoryTimezone,
      });
      toast.success('Machine Efficiency Analysis PDF report generated successfully');
    } catch (err) {
      console.error('Efficiency summary PDF export failed:', err);
      toast.error('Failed to generate Efficiency Analytics PDF report');
    } finally {
      setIsExportingSummaryPdf(false);
    }
  };

  const handleExportDetailedPdf = async () => {
    if (detailedRows.length === 0) {
      toast.error('No detailed records available to export');
      return;
    }

    setIsExportingDetailedPdf(true);
    try {
      AnalyticsPdfService.exportDetailedEfficiency({
        records: detailedRows,
        machineNumber: selectedLoomNumber,
        startDate,
        endDate,
        shift,
        factoryName: user?.factoryName,
        factoryTimezone: user?.factoryTimezone,
      });
      toast.success('Detailed Efficiency Log PDF generated successfully');
    } catch (err) {
      console.error('Detailed log PDF export failed:', err);
      toast.error('Failed to generate Detailed Efficiency Log PDF');
    } finally {
      setIsExportingDetailedPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col font-sans">
      <AnalyticsHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Percent className="w-6 h-6 text-purple-400" />
            Efficiency Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mill-wide OEE tracking, arithmetic mean comparisons, individual loom trends, and benchmark threshold monitoring.
          </p>
        </div>

        {/* Filters */}
        <AnalyticsFilterBar
          startDate={startDate}
          endDate={endDate}
          shift={shift}
          onDateChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
          onShiftChange={setShift}
          onRefresh={loadData}
          loading={loading}
          showMachineSelect={true}
          selectedMachineId={selectedMachineId}
          machines={machines}
          onMachineChange={setSelectedMachineId}
          onExportPdf={handleExportSummaryPdf}
          isExportingPdf={isExportingSummaryPdf}
          exportPdfDisabled={!summary || !ranking}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 rounded-2xl border border-slate-800 bg-slate-900/40">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Calculating efficiency statistics...</p>
          </div>
        ) : error ? (
          <div className="p-12 rounded-2xl border border-red-500/30 bg-red-500/10 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-red-200">Failed to Load Efficiency Analytics</h3>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
          </div>
        ) : summary && ranking ? (
          <>
            {/* ── Summary Cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Overall Average Efficiency */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-purple-500/30 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                    Overall Average Efficiency
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-white font-mono">
                      {summary.overallAvgEfficiency !== null ? `${summary.overallAvgEfficiency.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Arithmetic mean</span>
                  <span className="font-mono text-slate-300 font-semibold">{summary.overallEntriesCount} recorded entries</span>
                </div>
              </div>

              {/* Day-Shift Average Efficiency */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-blue-500/30 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Day-Shift Average Efficiency
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-blue-400 font-mono">
                      {summary.dayAvgEfficiency !== null ? `${summary.dayAvgEfficiency.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>11-hr Day shifts</span>
                  <span className="font-mono text-slate-300 font-semibold">{summary.dayEntriesCount} entries</span>
                </div>
              </div>

              {/* Night-Shift Average Efficiency */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-indigo-500/30 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    Night-Shift Average Efficiency
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-indigo-400 font-mono">
                      {summary.nightAvgEfficiency !== null ? `${summary.nightAvgEfficiency.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>13-hr Night shifts</span>
                  <span className="font-mono text-slate-300 font-semibold">{summary.nightEntriesCount} entries</span>
                </div>
              </div>
            </div>

            {/* ── Individual Machine Efficiency Trend & Details ──────────── */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    Loom Efficiency Trend
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chronological performance curve across selected shifts
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleDetailed}
                  disabled={loadingDetails}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-all self-start sm:self-auto"
                >
                  <TableIcon className="w-3.5 h-3.5 text-purple-400" />
                  {showDetailedTable ? 'Hide Detailed Analysis' : 'View Detailed Analysis'}
                  {showDetailedTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {trend?.points.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                  No efficiency records for this loom in the selected period.
                </div>
              ) : (
                <div id="efficiency-trend-chart" className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend?.points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickFormatter={(d: string) => {
                          const parts = d.split('-');
                          return `${parts[2]}/${parts[1]}`;
                        }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val}%`, 'Efficiency']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="efficiencyPercent"
                        name="Efficiency (%)"
                        stroke="#a855f7"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#a855f7' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Detailed Breakdown Table (collapsible) */}
              {showDetailedTable && (
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                      Loom Audit Log (Snapshots)
                    </h4>
                    <button
                      type="button"
                      onClick={handleExportDetailedPdf}
                      disabled={isExportingDetailedPdf || detailedRows.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                      title="Export Detailed Machine Efficiency Records as PDF"
                    >
                      {isExportingDetailedPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 text-purple-200" />
                      )}
                      <span>{isExportingDetailedPdf ? 'Exporting...' : 'Export Detailed Log PDF'}</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Shift</th>
                          <th className="py-2.5 px-3">Fabric Quality</th>
                          <th className="py-2.5 px-3 text-right">RPM</th>
                          <th className="py-2.5 px-3 text-right">PPI</th>
                          <th className="py-2.5 px-3 text-center">Mode</th>
                          <th className="py-2.5 px-3 text-right">Theoretical (m)</th>
                          <th className="py-2.5 px-3 text-right">Actual (m)</th>
                          <th className="py-2.5 px-3 text-right">Efficiency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {detailedRows.map((r, idx) => {
                          const badge = getEfficiencyBadgeColor(r.efficiencyPercent);
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-mono text-slate-300">
                                {formatFriendlyDate(r.productionDate)}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-200">
                                {r.shift}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">{r.fabricQuality}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">{r.rpmSnapshot}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">{r.ppiSnapshot}</td>
                              <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                                {r.efficiencyMode}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                {r.theoreticalProductionMeters !== null ? `${r.theoreticalProductionMeters} m` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                                {r.actualProductionMeters} m
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs border ${badge.bg} ${badge.text} ${badge.border}`}
                                >
                                  {r.efficiencyPercent !== null ? `${r.efficiencyPercent}%` : '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ── Machine Efficiency Ranking & Minimum Threshold ────────── */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Filter className="w-4 h-4 text-purple-400" />
                    Loom Efficiency Rankings & Benchmark Target
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Average efficiency rankings across all recorded looms in selected period.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
                    Minimum Target:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 text-right font-mono font-bold text-purple-400 text-xs rounded focus:outline-none"
                  />
                  <span className="text-xs text-purple-400 font-bold">%</span>
                </div>
              </div>

              {/* Below threshold banner if any */}
              {ranking.belowThreshold.length > 0 && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-xs text-red-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>
                      <strong className="text-white">{ranking.belowThreshold.length} looms</strong> are
                      operating below the {minThreshold}% efficiency benchmark.
                    </span>
                  </div>
                  {ranking.missingDataLoomsCount > 0 && (
                    <span className="text-slate-400 text-[11px]">
                      ({ranking.missingDataLoomsCount} active looms had no recorded data)
                    </span>
                  )}
                </div>
              )}

              {/* Ranking Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Loom</th>
                      <th className="py-2.5 px-3 text-right">Avg Efficiency</th>
                      <th className="py-2.5 px-3 text-right">Day Shift Avg</th>
                      <th className="py-2.5 px-3 text-right">Night Shift Avg</th>
                      <th className="py-2.5 px-3 text-right">Valid Entries</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {ranking.ranking.map((r) => {
                      const isBelow = r.avgEfficiency < minThreshold;
                      const badge = getEfficiencyBadgeColor(r.avgEfficiency);

                      return (
                        <tr key={r.machineId} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-300">#{r.rank}</td>
                          <td className="py-2.5 px-3 font-bold text-white">Loom {r.machineNumber}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded border text-xs ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {r.avgEfficiency.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {r.dayAvgEfficiency !== null ? `${r.dayAvgEfficiency.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {r.nightAvgEfficiency !== null ? `${r.nightAvgEfficiency.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                            {r.validEntriesCount}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isBelow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                Below Target
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                On Target
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};
