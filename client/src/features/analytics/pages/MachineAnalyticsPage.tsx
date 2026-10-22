import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cpu,
  Calendar,
  AlertCircle,
  Loader2,
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
  MachineAnalyticsData,
} from '../types/analytics.types';
import { formatFriendlyDate } from '@/features/production/utils/production-calc';

export const MachineAnalyticsPage: React.FC = () => {
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

  const [machines, setMachines] = useState<ActiveMachineOption[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [data, setData] = useState<MachineAnalyticsData | null>(null);

  const [loadingMachines, setLoadingMachines] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Load machines first
  useEffect(() => {
    const initMachines = async () => {
      setLoadingMachines(true);
      try {
        const list = await AnalyticsService.getActiveMachines();
        setMachines(list);
        if (list.length > 0) {
          setSelectedMachineId(list[0].id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load machines';
        toast.error(msg);
      } finally {
        setLoadingMachines(false);
      }
    };
    void initMachines();
  }, []);

  // Load machine analytics when machine or filters change
  const loadData = useCallback(async () => {
    if (!selectedMachineId) return;

    setLoadingData(true);
    setError(null);
    try {
      const result = await AnalyticsService.getMachineAnalytics({
        machineId: selectedMachineId,
        startDate,
        endDate,
        shift,
      });
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load machine analytics';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingData(false);
    }
  }, [selectedMachineId, startDate, endDate, shift]);

  const handleExportPdf = async () => {
    if (!data) {
      toast.error('No machine analytics data available to export');
      return;
    }

    setIsExportingPdf(true);
    try {
      const chartImage = await AnalyticsPdfService.captureChart('machine-trend-chart');
      AnalyticsPdfService.exportMachineAnalytics({
        data,
        chartImage,
        startDate,
        endDate,
        shift,
        factoryName: user?.factoryName,
        factoryLogo: user?.factoryLogo,
        factoryTimezone: user?.factoryTimezone,
      });
      toast.success(`Machine ${data.currentConfig.machineNumber} PDF report generated successfully`);
    } catch (err) {
      console.error('Machine PDF export failed:', err);
      toast.error('Failed to generate Machine Analytics PDF report');
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
            <Cpu className="w-6 h-6 text-indigo-400" />
            Machine Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Individual loom yield metrics, current configuration vs historical snapshots, and day/night shift comparisons.
          </p>
        </div>

        {/* Filter bar with machine selector */}
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
          loading={loadingData || loadingMachines}
          showMachineSelect={true}
          selectedMachineId={selectedMachineId}
          machines={machines}
          onMachineChange={setSelectedMachineId}
          onExportPdf={handleExportPdf}
          isExportingPdf={isExportingPdf}
          exportPdfDisabled={!data}
        />

        {loadingMachines || loadingData ? (
          <div className="flex flex-col items-center justify-center p-20 rounded-2xl border border-slate-800 bg-slate-900/40">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Loading machine analytics...</p>
          </div>
        ) : error ? (
          <div className="p-12 rounded-2xl border border-red-500/30 bg-red-500/10 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-red-200">Failed to Load Data</h3>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Current Machine Configuration Banner */}
            <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 rounded-2xl border border-indigo-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black text-white">
                    Loom {data.currentConfig.machineNumber}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {data.currentConfig.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active fabric assignment:{' '}
                  <span className="text-slate-200 font-semibold">{data.currentConfig.fabricName}</span>
                  {data.currentConfig.fabricCode && (
                    <span className="ml-1 text-[11px] text-teal-400 font-mono">
                      ({data.currentConfig.fabricCode})
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="px-3 py-1.5 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase font-sans">Current RPM</span>
                  <span className="text-indigo-400 font-bold text-sm">{data.currentConfig.rpm}</span>
                </div>
                <div className="px-3 py-1.5 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase font-sans">Current PPI</span>
                  <span className="text-purple-400 font-bold text-sm">{data.currentConfig.ppi}</span>
                </div>
              </div>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Meters */}
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Meters</span>
                <span className="text-xl font-black text-white font-mono mt-1">
                  {data.totalProductionMeters.toLocaleString('en-IN')} m
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">{data.recordCount} shifts recorded</span>
              </div>

              {/* Avg Combined Daily */}
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-indigo-500/30 bg-indigo-950/20 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-indigo-300 uppercase">Combined Daily</span>
                <span className="text-xl font-black text-indigo-400 font-mono mt-1">
                  {data.avgCombinedDailyProduction.toLocaleString('en-IN')} m
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Day + Night per date</span>
              </div>

              {/* Avg Day Shift */}
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-blue-400 uppercase">Avg Day Shift</span>
                <span className="text-xl font-black text-blue-400 font-mono mt-1">
                  {data.avgDayShiftProduction.toLocaleString('en-IN')} m
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">11-hour shifts</span>
              </div>

              {/* Avg Night Shift */}
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-purple-400 uppercase">Avg Night Shift</span>
                <span className="text-xl font-black text-purple-400 font-mono mt-1">
                  {data.avgNightShiftProduction.toLocaleString('en-IN')} m
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">13-hour shifts</span>
              </div>

              {/* Best Day */}
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase">Best Day</span>
                <span className="text-xl font-black text-emerald-400 font-mono mt-1">
                  {data.bestDay ? `${data.bestDay.meters} m` : '—'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  {data.bestDay ? formatFriendlyDate(data.bestDay.date) : 'No records'}
                </span>
              </div>

              {/* Lowest Day */}
              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase">Lowest Day</span>
                <span className="text-xl font-black text-amber-400 font-mono mt-1">
                  {data.lowestDay ? `${data.lowestDay.meters} m` : '—'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  {data.lowestDay ? formatFriendlyDate(data.lowestDay.date) : 'No records'}
                </span>
              </div>
            </div>

            {/* Machine Trend Chart */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Loom {data.currentConfig.machineNumber} Production History (Meters)
              </h3>

              {data.trend.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                  No production records found for Loom {data.currentConfig.machineNumber} in this range.
                </div>
              ) : (
                <div id="machine-trend-chart" className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                          <Bar dataKey="dayMeters" name="Day Shift (m)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="nightMeters" name="Night Shift (m)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                        </>
                      ) : (
                        <Bar dataKey="totalMeters" name="Output (m)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      )}
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
