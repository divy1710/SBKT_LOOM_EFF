import React from 'react';
import { Calendar, Sun, Moon, Layers, RefreshCw, Cpu, FileDown, Loader2 } from 'lucide-react';
import type { AnalyticsShift } from '../types/analytics.types';
import type { ActiveMachineOption } from '../services/analytics.service';

interface AnalyticsFilterBarProps {
  startDate: string;
  endDate: string;
  shift: AnalyticsShift;
  onDateChange: (startDate: string, endDate: string) => void;
  onShiftChange: (shift: AnalyticsShift) => void;
  onRefresh: () => void;
  loading?: boolean;

  // Optional machine selector
  showMachineSelect?: boolean;
  selectedMachineId?: string;
  machines?: ActiveMachineOption[];
  onMachineChange?: (machineId: string) => void;

  // Export PDF Action
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  exportPdfDisabled?: boolean;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  startDate,
  endDate,
  shift,
  onDateChange,
  onShiftChange,
  onRefresh,
  loading = false,
  showMachineSelect = false,
  selectedMachineId,
  machines = [],
  onMachineChange,
  onExportPdf,
  isExportingPdf = false,
  exportPdfDisabled = false,
}) => {
  // Preset handlers
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    onDateChange(fmt(start), fmt(end));
  };

  const setThisMonth = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    onDateChange(fmt(start), fmt(end));
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 shadow-xl backdrop-blur-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date Inputs & Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none"
            />
            <span className="text-slate-600 text-xs font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none"
            />
          </div>

          {/* Quick Presets */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPreset(1)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-300 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPreset(7)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-300 transition-colors"
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setPreset(30)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-300 transition-colors"
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={setThisMonth}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-300 transition-colors"
            >
              This Month
            </button>
          </div>
        </div>

        {/* Shift Filter Buttons */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onShiftChange('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                shift === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              Combined
            </button>
            <button
              type="button"
              onClick={() => onShiftChange('DAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                shift === 'DAY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-400" />
              Day
            </button>
            <button
              type="button"
              onClick={() => onShiftChange('NIGHT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                shift === 'NIGHT'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3 h-3 text-indigo-300" />
              Night
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Export PDF Button */}
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf || exportPdfDisabled || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:pointer-events-none"
              title="Export Analytics PDF Report"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-indigo-200" />
              )}
              <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Machine Selector */}
      {showMachineSelect && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">Select Loom:</span>
          <select
            value={selectedMachineId}
            onChange={(e) => onMachineChange?.(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-100 focus:outline-none"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.machineNumber} {m.name ? `(${m.name})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
