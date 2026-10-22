import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import type {
  AnalyticsShift,
  ProductionSummaryData,
  ProductionTrendItem,
} from '../types/analytics.types';
import { formatFriendlyDate } from '@/features/production/utils/production-calc';

export const ProductionAnalysisPage: React.FC = () => {
  const { user } = useAuth();

  // Default to last 30 days
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

  const [summary, setSummary] = useState<ProductionSummaryData | null>(null);
  const [trend, setTrend] = useState<ProductionTrendItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, trendData] = await Promise.all([
        AnalyticsService.getProductionSummary({ startDate, endDate, shift }),
        AnalyticsService.getProductionTrend({ startDate, endDate, shift }),
      ]);
      setSummary(sumData);
      setTrend(trendData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load production analytics';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, shift]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDateChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleExportPdf = async () => {
    if (!summary) {
      toast.error('No production summary available to export');
      return;
    }

    setIsExportingPdf(true);
    try {
      const chartImage = await AnalyticsPdfService.captureChart('production-trend-chart');
      AnalyticsPdfService.exportProductionAnalysis({
        summary,
        trend,
        chartImage,
        startDate,
        endDate,
        shift,
        factoryName: user?.factoryName,
        factoryLogo: user?.factoryLogo,
        factoryTimezone: user?.factoryTimezone,
      });
      toast.success('Production Analysis PDF report generated successfully');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to generate Production Analysis PDF report');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col font-sans">
      <AnalyticsHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Title & Description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              Production Analysis
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Historical production volumes, comparative benchmarks, smart trends, and day/night shift yields.
            </p>
          </div>
        </div>

        {/* Shared Filters */}
        <AnalyticsFilterBar
          startDate={startDate}
          endDate={endDate}
          shift={shift}
          onDateChange={handleDateChange}
          onShiftChange={setShift}
          onRefresh={loadData}
          loading={loading}
          onExportPdf={handleExportPdf}
          isExportingPdf={isExportingPdf}
          exportPdfDisabled={!summary}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 rounded-2xl border border-slate-800 bg-slate-900/40">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Computing production analytics...</p>
          </div>
        ) : error ? (
          <div className="p-12 rounded-2xl border border-red-500/30 bg-red-500/10 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-red-200">Unable to Load Analytics</h3>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : summary ? (
          <>
            {/* ── A. Smart Insights ───────────────────────────────────────── */}
            {summary.insights && summary.insights.length > 0 && (
              <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/30 p-5 shadow-xl backdrop-blur-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">
                    Smart Production Insights
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {summary.insights.map((ins) => (
                    <div
                      key={ins.id}
                      className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-indigo-500/40 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-100">{ins.title}</h4>
                          {ins.metric && (
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                              {ins.metric}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          {ins.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── C. Summary Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Selected Period */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Selected Period
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {summary.periodProduction.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">meters</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">
                    {formatFriendlyDate(startDate)} – {formatFriendlyDate(endDate)}
                  </span>
                  {summary.percentageChange !== null && (
                    <span
                      className={`font-mono font-bold flex items-center gap-0.5 ${
                        summary.percentageChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {summary.percentageChange >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {summary.percentageChange > 0 ? `+${summary.percentageChange}%` : `${summary.percentageChange}%`}
                    </span>
                  )}
                </div>
              </div>

              {/* Previous Comparable Period */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Previous Period
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-300 font-mono">
                      {summary.previousPeriodProduction.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">meters</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
                  {formatFriendlyDate(summary.comparisonPeriod.startDate)} –{' '}
                  {formatFriendlyDate(summary.comparisonPeriod.endDate)}
                </div>
              </div>

              {/* Current Week */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    This Week
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-blue-400 font-mono">
                      {summary.weekProduction.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">meters</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Current calendar week (Mon – Sun)
                </div>
              </div>

              {/* Current Month */}
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    This Month
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-purple-400 font-mono">
                      {summary.monthProduction.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">meters</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-500">
                  1st of current month to date
                </div>
              </div>
            </div>

            {/* ── D. Key Metrics Row ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Average Daily Production */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Daily Production</span>
                <span className="text-lg font-black text-indigo-400 font-mono mt-1">
                  {summary.avgDailyProduction.toLocaleString('en-IN')} m
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Across {summary.distinctDaysCount} active production days
                </span>
              </div>

              {/* Best Production Day */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col">
                <span className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Best Day
                </span>
                <span className="text-lg font-black text-emerald-400 font-mono mt-1">
                  {summary.bestDay ? `${summary.bestDay.meters.toLocaleString('en-IN')} m` : '—'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {summary.bestDay ? formatFriendlyDate(summary.bestDay.date) : 'No records'}
                </span>
              </div>

              {/* Lowest Production Day */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col">
                <span className="text-[11px] font-bold text-amber-400 uppercase">Lowest Day</span>
                <span className="text-lg font-black text-amber-400 font-mono mt-1">
                  {summary.lowestDay ? `${summary.lowestDay.meters.toLocaleString('en-IN')} m` : '—'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {summary.lowestDay ? formatFriendlyDate(summary.lowestDay.date) : 'No records'}
                </span>
              </div>

              {/* Best Machine */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col">
                <span className="text-[11px] font-bold text-purple-400 uppercase flex items-center gap-1">
                  <Award className="w-3 h-3" /> Top Machine
                </span>
                <span className="text-lg font-black text-purple-400 font-mono mt-1">
                  {summary.bestMachine ? `Loom ${summary.bestMachine.machineNumber}` : '—'}
                </span>
                <span className="text-[10px] text-slate-400 truncate mt-0.5">
                  {summary.bestMachine
                    ? `${summary.bestMachine.meters.toLocaleString('en-IN')} m (${summary.bestMachine.fabricName})`
                    : 'No records'}
                </span>
              </div>
            </div>

            {/* ── E. Production Trend Graph ───────────────────────────────── */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Daily Production Trend (Meters)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aggregated daily output for {shift === 'ALL' ? 'Combined shifts' : `${shift} shift`}
                  </p>
                </div>
              </div>

              {trend.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                  No production records in the selected date range.
                </div>
              ) : (
                <div id="production-trend-chart" className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="dayColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="nightColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
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
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      {shift === 'ALL' ? (
                        <>
                          <Area
                            type="monotone"
                            dataKey="dayMeters"
                            name="Day Shift (m)"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#dayColor)"
                          />
                          <Area
                            type="monotone"
                            dataKey="nightMeters"
                            name="Night Shift (m)"
                            stroke="#a855f7"
                            fillOpacity={1}
                            fill="url(#nightColor)"
                          />
                        </>
                      ) : (
                        <Area
                          type="monotone"
                          dataKey="totalMeters"
                          name="Total Output (m)"
                          stroke="#6366f1"
                          fillOpacity={1}
                          fill="url(#totalColor)"
                        />
                      )}
                    </AreaChart>
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
