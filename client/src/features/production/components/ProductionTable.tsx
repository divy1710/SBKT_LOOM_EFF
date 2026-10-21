import React from 'react';
import {
  EfficiencyMode,
  ProductionMachineStatus,
} from '../types/production.types';
import {
  calculateEfficiency,
  getEfficiencyBadgeColor,
} from '../utils/production-calc';
import { Cpu, AlertTriangle, Play, Square, Wrench } from 'lucide-react';

export interface EditableProductionRow {
  machineId: string;
  machineNumber: string;
  machineName?: string;
  fabricId?: string;
  fabricName: string;
  fabricCode?: string;
  machineStatus: ProductionMachineStatus;
  rpm: number;
  ppi: number;
  shiftDurationHours: number;
  theoreticalProductionMeters: number | null;
  actualProductionMeters: number;
  efficiencyMode: EfficiencyMode;
  efficiencyPercent: number | null;
  notes?: string;
  hasFabric: boolean;
}

interface ProductionTableProps {
  rows: EditableProductionRow[];
  onChangeRow: (index: number, updated: Partial<EditableProductionRow>) => void;
  isReadOnly: boolean;
}

export const ProductionTable: React.FC<ProductionTableProps> = ({
  rows,
  onChangeRow,
  isReadOnly,
}) => {
  const handleMetersChange = (index: number, rawVal: string) => {
    const row = rows[index];
    const val = rawVal === '' ? 0 : parseFloat(rawVal);
    const actualMeters = isNaN(val) ? 0 : Math.max(0, val);

    let newEfficiency = row.efficiencyPercent;
    if (row.efficiencyMode === EfficiencyMode.AUTO) {
      newEfficiency = calculateEfficiency(actualMeters, row.theoreticalProductionMeters);
    }

    onChangeRow(index, {
      actualProductionMeters: actualMeters,
      efficiencyPercent: newEfficiency,
    });
  };

  const handleModeToggle = (index: number) => {
    const row = rows[index];
    const newMode =
      row.efficiencyMode === EfficiencyMode.AUTO
        ? EfficiencyMode.MANUAL
        : EfficiencyMode.AUTO;

    let newEfficiency: number | null = row.efficiencyPercent;
    if (newMode === EfficiencyMode.AUTO) {
      newEfficiency = calculateEfficiency(
        row.actualProductionMeters,
        row.theoreticalProductionMeters,
      );
    }

    onChangeRow(index, {
      efficiencyMode: newMode,
      efficiencyPercent: newEfficiency,
    });
  };

  const handleManualEfficiencyChange = (index: number, rawVal: string) => {
    const val = rawVal === '' ? 0 : parseFloat(rawVal);
    const eff = isNaN(val) ? null : Math.max(0, val);
    onChangeRow(index, {
      efficiencyPercent: eff,
    });
  };

  const handleNotesChange = (index: number, rawVal: string) => {
    onChangeRow(index, {
      notes: rawVal,
    });
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800">
        <Cpu className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-base font-medium text-slate-300">No Looms Available</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          No active machines found for this factory. Add active looms in Machine Management to record production.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40 shadow-xl backdrop-blur-sm">
      <table className="w-full text-left text-sm">
        {/* Table Header */}
        <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4 font-semibold">Machine</th>
            <th className="py-3.5 px-4 font-semibold">Fabric Quality</th>
            <th className="py-3.5 px-3 font-semibold text-center">Status</th>
            <th className="py-3.5 px-3 font-semibold text-right">RPM</th>
            <th className="py-3.5 px-3 font-semibold text-right">PPI</th>
            <th className="py-3.5 px-3 font-semibold text-center">Mode</th>
            <th className="py-3.5 px-4 font-semibold text-right">Efficiency</th>
            <th className="py-3.5 px-4 font-semibold text-right">Production (Meters)</th>
            <th className="py-3.5 px-4 font-semibold">Notes</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-slate-800/60 font-medium">
          {rows.map((row, index) => {
            const badgeStyle = getEfficiencyBadgeColor(row.efficiencyPercent);
            const isMaintenance = row.machineStatus === ProductionMachineStatus.MAINTENANCE;
            const isStopped = row.machineStatus === ProductionMachineStatus.STOPPED;

            return (
              <tr
                key={row.machineId}
                className="hover:bg-slate-800/30 transition-colors group"
              >
                {/* 1. Machine Number */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                      {row.machineNumber}
                    </span>
                    {row.machineName && (
                      <span className="text-xs text-slate-500 truncate max-w-[100px]">
                        {row.machineName}
                      </span>
                    )}
                  </div>
                </td>

                {/* 2. Fabric Quality */}
                <td className="py-3 px-4">
                  {row.hasFabric ? (
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-medium truncate max-w-[180px]">
                        {row.fabricName}
                      </span>
                      {row.fabricCode && (
                        <span className="text-[11px] text-teal-400/80 font-mono">
                          {row.fabricCode}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      Unassigned
                    </span>
                  )}
                </td>

                {/* 3. Machine Status */}
                <td className="py-3 px-3 text-center">
                  {row.machineStatus === ProductionMachineStatus.RUNNING && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      Running
                    </span>
                  )}
                  {isStopped && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                      <Square className="w-2.5 h-2.5 fill-current" />
                      Stopped
                    </span>
                  )}
                  {isMaintenance && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Wrench className="w-2.5 h-2.5" />
                      Maint.
                    </span>
                  )}
                </td>

                {/* 4. RPM */}
                <td className="py-3 px-3 text-right font-mono text-slate-300">
                  {row.rpm}
                </td>

                {/* 5. PPI */}
                <td className="py-3 px-3 text-right font-mono text-slate-300">
                  {row.ppi}
                </td>

                {/* 6. Mode (Auto / Manual toggle) */}
                <td className="py-3 px-3 text-center">
                  {isReadOnly ? (
                    <span className="text-xs text-slate-400 font-mono">
                      {row.efficiencyMode}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleModeToggle(index)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all border ${
                        row.efficiencyMode === EfficiencyMode.AUTO
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25'
                          : 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25'
                      }`}
                      title={`Switch to ${row.efficiencyMode === EfficiencyMode.AUTO ? 'Manual' : 'Automatic'} efficiency`}
                    >
                      {row.efficiencyMode}
                    </button>
                  )}
                </td>

                {/* 7. Efficiency % */}
                <td className="py-3 px-4 text-right">
                  {row.efficiencyMode === EfficiencyMode.AUTO || isReadOnly ? (
                    <div className="flex flex-col items-end">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md font-mono text-xs font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                      >
                        {row.efficiencyPercent !== null
                          ? `${row.efficiencyPercent.toFixed(1)}%`
                          : '—'}
                      </span>
                      {row.theoreticalProductionMeters !== null && (
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                          tgt: {row.theoreticalProductionMeters}m
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min="0"
                        max="500"
                        step="0.1"
                        disabled={isReadOnly}
                        value={row.efficiencyPercent !== null ? row.efficiencyPercent : ''}
                        onChange={(e) => handleManualEfficiencyChange(index, e.target.value)}
                        placeholder="%"
                        className="w-20 px-2 py-1 bg-slate-900 border border-purple-500/40 focus:border-purple-400 text-right font-mono text-xs text-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                      <span className="text-xs text-purple-400 font-bold">%</span>
                    </div>
                  )}
                </td>

                {/* 8. Production Meters */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      disabled={isReadOnly}
                      value={row.actualProductionMeters === 0 ? '' : row.actualProductionMeters}
                      onChange={(e) => handleMetersChange(index, e.target.value)}
                      placeholder="0.0"
                      className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-blue-500 text-right font-mono text-sm font-bold text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-60"
                    />
                    <span className="text-xs text-slate-500 font-semibold">m</span>
                  </div>
                </td>

                {/* 9. Notes */}
                <td className="py-3 px-4">
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={row.notes || ''}
                    onChange={(e) => handleNotesChange(index, e.target.value)}
                    placeholder="Optional notes..."
                    maxLength={100}
                    className="w-full min-w-[120px] max-w-[200px] px-2.5 py-1 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500/60 rounded text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-60"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
