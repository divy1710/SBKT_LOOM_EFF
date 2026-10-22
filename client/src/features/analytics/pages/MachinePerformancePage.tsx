import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Trophy,
  TrendingDown,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AnalyticsHeader } from '../components/AnalyticsHeader';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsPdfService } from '../services/analyticsPdf.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type {
  AnalyticsShift,
  MachinePerformanceData,
} from '../types/analytics.types';

export const MachinePerformancePage: React.FC = () => {
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
  const [threshold, setThreshold] = useState<number>(150);

  const [data, setData] = useState<MachinePerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await AnalyticsService.getMachinePerformance({
        startDate,
        endDate,
        shift,
        threshold,
        thresholdType: 'AVERAGE',
      });
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load performance analytics';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, shift, threshold]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExportPdf = async () => {
    if (!data) {
      toast.error('No performance analytics data available to export');
      return;
    }

    setIsExportingPdf(true);
    try {
      const chartImage = await AnalyticsPdfService.captureChart('machine-comparison-chart');
      AnalyticsPdfService.exportMachinePerformance({
        data,
        threshold,
        chartImage,
        startDate,
        endDate,
        shift,
        factoryName: user?.factoryName,
        factoryLogo: user?.factoryLogo,
        factoryTimezone: user?.factoryTimezone,
      });
      toast.success('Machine Performance PDF report generated successfully');
    } catch (err) {
      console.error('Performance PDF export failed:', err);
      toast.error('Failed to generate Machine Performance PDF report');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col font-sans">
      <AnalyticsHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Machine Performance Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Production-based loom rankings, volume leaders, lagging machines, and customizable meter threshold audits.
          </p>
        </div>

        {/* Filter bar */}
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
          onExportPdf={handleExportPdf}
          isExportingPdf={isExportingPdf}
          exportPdfDisabled={!data}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 rounded-2xl border border-slate-800 bg-slate-900/40">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Computing machine rankings...</p>
          </div>
        ) : error ? (
          <div className="p-12 rounded-2xl border border-red-500/30 bg-red-500/10 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-red-200">Failed to Load Rankings</h3>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* ── Top 5 & Bottom 5 Grid ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 5 Machines */}
              <div className="bg-slate-900/80 rounded-2xl border border-emerald-500/30 p-5 shadow-xl backdrop-blur-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Trophy className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Top 5 Production Leaders
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Ranked by total output
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Loom</th>
                        <th className="py-2.5 px-3">Fabric</th>
                        <th className="py-2.5 px-3 text-right">Total Meters</th>
                        <th className="py-2.5 px-3 text-right">Avg / Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {data.top5.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            No production records found.
                          </td>
                        </tr>
                      ) : (
                        data.top5.map((m) => (
                          <tr key={m.machineId} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                              #{m.rank}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-200">
                              Loom {m.machineNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 truncate max-w-[120px]">
                              {m.fabricName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                              {m.totalProductionMeters.toLocaleString('en-IN')} m
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                              {m.avgProductionPerShift} m
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom 5 Machines */}
              <div className="bg-slate-900/80 rounded-2xl border border-amber-500/30 p-5 shadow-xl backdrop-blur-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <TrendingDown className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Bottom 5 Looms (Output)
                    </h3>
                  </div>
                  {data.unrecordedMachinesCount > 0 && (
                    <span className="text-[10px] text-amber-400 font-semibold">
                      ({data.unrecordedMachinesCount} looms had 0 recorded shifts)
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Loom</th>
                        <th className="py-2.5 px-3">Fabric</th>
                        <th className="py-2.5 px-3 text-right">Total Meters</th>
                        <th className="py-2.5 px-3 text-right">Avg / Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {data.bottom5.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            No production records found.
                          </td>
                        </tr>
                      ) : (
                        data.bottom5.map((m) => (
                          <tr key={m.machineId} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                              #{m.rank}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-200">
                              Loom {m.machineNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 truncate max-w-[120px]">
                              {m.fabricName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                              {m.totalProductionMeters.toLocaleString('en-IN')} m
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                              {m.avgProductionPerShift} m
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── C. Meter-Threshold Filter ──────────────────────────────── */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Filter className="w-4 h-4 text-amber-400" />
                    Low Output Threshold Audit
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Highlights active looms whose average production per recorded shift is below configured target.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
                    Average Shift Threshold:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={threshold}
                    onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 text-right font-mono font-bold text-amber-400 text-xs rounded focus:outline-none"
                  />
                  <span className="text-xs text-slate-500 font-bold">m</span>
                </div>
              </div>

              {data.belowThreshold.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-emerald-400 text-xs font-semibold">
                  ✓ All recorded looms met or exceeded the {threshold} m/shift benchmark!
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-red-500/30 bg-red-500/5">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Loom</th>
                        <th className="py-2.5 px-3">Fabric Quality</th>
                        <th className="py-2.5 px-3 text-right">Avg Meters / Shift</th>
                        <th className="py-2.5 px-3 text-right">Deficit from Target</th>
                        <th className="py-2.5 px-3 text-right">Recorded Shifts</th>
                        <th className="py-2.5 px-3 text-right">Total Meters</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {data.belowThreshold.map((m) => (
                        <tr key={m.machineId} className="hover:bg-red-500/10">
                          <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Loom {m.machineNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{m.fabricName}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                            {m.avgProductionPerShift} m
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-red-400">
                            -{m.deficitMeters} m
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                            {m.entriesCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {m.totalProductionMeters.toLocaleString('en-IN')} m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── D. Machine Comparison Chart ────────────────────────────── */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white">Loom Production Volume Comparison</h3>

              {data.comparison.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                  No machine comparison records.
                </div>
              ) : (
                <div id="machine-comparison-chart" className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.comparison}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis
                        dataKey="machineNumber"
                        stroke="#94a3b8"
                        fontSize={11}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                      />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val.toLocaleString('en-IN')} meters`, 'Total Output']}
                      />
                      <Bar dataKey="totalProductionMeters" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};
