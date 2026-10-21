import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  AlertCircle,
  Loader2,
  PieChart as PieChartIcon,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { AnalyticsHeader } from '../components/AnalyticsHeader';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsPdfService } from '../services/analyticsPdf.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type {
  AnalyticsShift,
  FabricQualityAnalyticsData,
} from '../types/analytics.types';

const COLORS = [
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#f97316', // orange
];

export const FabricQualityAnalyticsPage: React.FC = () => {
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

  const [data, setData] = useState<FabricQualityAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<'totalProductionMeters' | 'percentageShare'>('totalProductionMeters');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await AnalyticsService.getFabricQuality({
        startDate,
        endDate,
        shift,
      });
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load fabric analytics';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, shift]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Sorted list for table
  const sortedFabrics = useMemo(() => {
    if (!data?.fabrics) return [];
    return [...data.fabrics].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      return sortAsc ? va - vb : vb - va;
    });
  }, [data, sortField, sortAsc]);

  const toggleSort = (field: 'totalProductionMeters' | 'percentageShare') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Pie chart data
  const chartData = useMemo(() => {
    if (!data?.fabrics) return [];
    return data.fabrics.map((f) => ({
      name: f.fabricName,
      value: f.totalProductionMeters,
      share: f.percentageShare,
    }));
  }, [data]);

  const handleExportPdf = async () => {
    if (!data) {
      toast.error('No fabric analytics data available to export');
      return;
    }

    setIsExportingPdf(true);
    try {
      const chartImage = await AnalyticsPdfService.captureChart('fabric-quality-chart');
      AnalyticsPdfService.exportFabricQuality({
        data,
        tableItems: sortedFabrics,
        chartImage,
        startDate,
        endDate,
        shift,
        factoryName: user?.factoryName,
        factoryTimezone: user?.factoryTimezone,
      });
      toast.success('Fabric Quality Analytics PDF report generated successfully');
    } catch (err) {
      console.error('Fabric PDF export failed:', err);
      toast.error('Failed to generate Fabric Quality Analytics PDF report');
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
            <Layers className="w-6 h-6 text-cyan-400" />
            Fabric Quality Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Production distribution and percentage volume shares across recorded fabric qualities and weaves.
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
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Analyzing fabric quality yields...</p>
          </div>
        ) : error ? (
          <div className="p-12 rounded-2xl border border-red-500/30 bg-red-500/10 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-red-200">Failed to Load Data</h3>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Top Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Total Fabric Production
                </span>
                <span className="text-2xl font-black text-white font-mono mt-1">
                  {data.grandTotalProduction.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-semibold text-slate-400">meters</span>
                </span>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-cyan-400 uppercase">
                  Active Fabric Qualities
                </span>
                <span className="text-2xl font-black text-cyan-400 font-mono mt-1">
                  {data.fabricsCount}
                </span>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-indigo-400 uppercase">
                  Dominant Quality
                </span>
                <span className="text-lg font-black text-indigo-300 truncate mt-1">
                  {data.topFabric ? data.topFabric.fabricName : '—'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {data.topFabric ? `${data.topFabric.percentageShare}% of total output` : 'No records'}
                </span>
              </div>
            </div>

            {/* Chart & Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Doughnut Chart */}
              <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-cyan-400" />
                    Production Share (%)
                  </h3>
                </div>

                {chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                    No fabric records in this period.
                  </div>
                ) : (
                  <div id="fabric-quality-chart" className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: any, name: any, props: any) => [
                            `${Number(value).toLocaleString('en-IN')} m (${props.payload.share}%)`,
                            name,
                          ]}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between overflow-hidden">
                <h3 className="text-sm font-bold text-white mb-3">Fabric Production Breakdown</h3>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3 font-semibold">Fabric Quality</th>
                        <th
                          className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                          onClick={() => toggleSort('totalProductionMeters')}
                        >
                          <span className="inline-flex items-center gap-1">
                            Meters <ArrowUpDown className="w-3 h-3" />
                          </span>
                        </th>
                        <th
                          className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                          onClick={() => toggleSort('percentageShare')}
                        >
                          <span className="inline-flex items-center gap-1">
                            Share <ArrowUpDown className="w-3 h-3" />
                          </span>
                        </th>
                        <th className="py-3 px-3 font-semibold text-right">Entries</th>
                        <th className="py-3 px-3 font-semibold text-right">Avg / Entry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {sortedFabrics.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No fabric records found.
                          </td>
                        </tr>
                      ) : (
                        sortedFabrics.map((f, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-200">{f.fabricName}</span>
                                {f.fabricCode && (
                                  <span className="text-[10px] text-teal-400 font-mono">
                                    {f.fabricCode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                              {f.totalProductionMeters.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">
                              {f.percentageShare}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                              {f.entriesCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                              {f.avgProductionPerEntry} m
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};
