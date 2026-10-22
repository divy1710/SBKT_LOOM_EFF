import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  Lock,
  Unlock,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  Home,
  LogOut,
  Calendar,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole, ROLE_LABELS } from '@/features/auth/types/auth.types';
import {
  ShiftType,
  ProductionSheetStatus,
  EfficiencyMode,
  ProductionMachineStatus,
} from '../types/production.types';
import type {
  ProductionSheet,
  SaveProductionSheetInput,
} from '../types/production.types';
import { ProductionService } from '../services/production.service';
import { ProductionTable } from '../components/ProductionTable';
import type { EditableProductionRow } from '../components/ProductionTable';
import {
  calculateTheoreticalProduction,
  formatFriendlyDate,
  getShiftTimingText,
} from '../utils/production-calc';
import { exportProductionSheetPdf } from '../utils/export-pdf';
import { exportProductionSheetExcel } from '../utils/export-excel';

export const ProductionSheetPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Date & Shift Selection ──────────────────────────────────────────────────
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(ShiftType.DAY);

  // ── Sheet State ─────────────────────────────────────────────────────────────
  const [currentSheet, setCurrentSheet] = useState<ProductionSheet | null>(null);
  const [rows, setRows] = useState<EditableProductionRow[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // ── UI / Loading States ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [completing, setCompleting] = useState<boolean>(false);
  const [reopening, setReopening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── Permissions ─────────────────────────────────────────────────────────────
  const canEdit = Boolean(
    user &&
      [
        UserRole.SUPER_ADMIN,
        UserRole.FACTORY_ADMIN,
        UserRole.MANAGER,
        UserRole.OPERATOR,
      ].includes(user.role as UserRole),
  );

  const canReopen = Boolean(
    user &&
      [UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN, UserRole.MANAGER].includes(
        user.role as UserRole,
      ),
  );

  const isCompleted = currentSheet?.status === ProductionSheetStatus.COMPLETED;
  const isReadOnly = !canEdit || isCompleted;

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed.');
    }
  };

  // ── Load Sheet or Initialize Machines ───────────────────────────────────────
  const loadSheetData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsDirty(false);

    try {
      // 1. Check if sheet exists for this date and shift
      const existing = await ProductionService.getByDate(selectedDate, selectedShift);

      if (existing) {
        setCurrentSheet(existing);
        setNotes(existing.notes || '');

        // Map existing entries to editable rows
        const mappedRows: EditableProductionRow[] = existing.entries.map((e) => ({
          machineId: e.machineId,
          machineNumber: e.machineNumberSnapshot,
          machineName: e.machineNameSnapshot,
          fabricId: e.fabricId,
          fabricName: e.fabricNameSnapshot,
          fabricCode: e.fabricCodeSnapshot,
          machineStatus: e.machineStatusSnapshot,
          rpm: e.rpmSnapshot,
          ppi: e.ppiSnapshot,
          shiftDurationHours: e.shiftDurationHours,
          theoreticalProductionMeters: e.theoreticalProductionMeters,
          actualProductionMeters: e.actualProductionMeters,
          efficiencyMode: e.efficiencyMode,
          efficiencyPercent: e.efficiencyPercent,
          notes: e.notes,
          hasFabric: Boolean(e.fabricNameSnapshot && e.fabricNameSnapshot !== 'NOT_ASSIGNED'),
        }));

        setRows(mappedRows);
      } else {
        // No existing sheet: Fetch active machines from factory
        setCurrentSheet(null);
        setNotes('');

        const machines = await ProductionService.getActiveMachines();
        const durationHours = selectedShift === ShiftType.DAY ? 11 : 13;

        const defaultRows: EditableProductionRow[] = machines.map((m) => {
          const theoretical = calculateTheoreticalProduction(m.rpm, m.ppi, durationHours);
          const hasFabric = Boolean(m.fabric);

          return {
            machineId: m.id,
            machineNumber: m.machineNumber,
            machineName: m.name,
            fabricId: m.fabric?.id,
            fabricName: m.fabric ? m.fabric.name : 'NOT_ASSIGNED',
            fabricCode: m.fabric?.code,
            machineStatus: m.status,
            rpm: m.rpm,
            ppi: m.ppi,
            shiftDurationHours: durationHours,
            theoreticalProductionMeters: theoretical,
            actualProductionMeters: 0,
            efficiencyMode: EfficiencyMode.AUTO,
            efficiencyPercent: 0,
            notes: '',
            hasFabric,
          };
        });

        setRows(defaultRows);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load production data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShift]);

  useEffect(() => {
    void loadSheetData();
  }, [loadSheetData]);

  // ── Warn Unsaved Changes ────────────────────────────────────────────────────
  const handleDateChange = (newDate: string) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved production changes. Discard and switch date?')) {
        return;
      }
    }
    setSelectedDate(newDate);
  };

  const handleShiftChange = (newShift: ShiftType) => {
    if (newShift === selectedShift) return;
    if (isDirty) {
      if (!window.confirm('You have unsaved production changes. Discard and switch shift?')) {
        return;
      }
    }
    setSelectedShift(newShift);
  };

  // ── Row Modification Handler ────────────────────────────────────────────────
  const handleRowChange = (index: number, updated: Partial<EditableProductionRow>) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated };
      return copy;
    });
    setIsDirty(true);
  };

  // ── Calculated Real-Time Totals ─────────────────────────────────────────────
  const liveTotals = useMemo(() => {
    let totalMeters = 0;
    let running = 0;
    let stopped = 0;
    let maintenance = 0;
    const validEfficiencies: number[] = [];

    for (const r of rows) {
      totalMeters += Number(r.actualProductionMeters) || 0;
      if (r.machineStatus === ProductionMachineStatus.RUNNING) running++;
      else if (r.machineStatus === ProductionMachineStatus.STOPPED) stopped++;
      else if (r.machineStatus === ProductionMachineStatus.MAINTENANCE) maintenance++;

      if (typeof r.efficiencyPercent === 'number' && isFinite(r.efficiencyPercent)) {
        validEfficiencies.push(r.efficiencyPercent);
      }
    }

    const avgEff =
      validEfficiencies.length > 0
        ? Number((validEfficiencies.reduce((a, b) => a + b, 0) / validEfficiencies.length).toFixed(2))
        : null;

    return {
      totalMeters: Number(totalMeters.toFixed(1)),
      running,
      stopped,
      maintenance,
      avgEff,
    };
  }, [rows]);

  // ── Save Sheet (Draft or Completed) ─────────────────────────────────────────
  const handleSave = async (statusToSet: ProductionSheetStatus = ProductionSheetStatus.DRAFT) => {
    if (rows.length === 0) {
      toast.error('No machines available to save in production sheet.');
      return;
    }

    if (statusToSet === ProductionSheetStatus.COMPLETED) {
      setCompleting(true);
    } else {
      setSaving(true);
    }

    try {
      const payload: SaveProductionSheetInput = {
        productionDate: selectedDate,
        shift: selectedShift,
        status: statusToSet,
        notes: notes.trim() || undefined,
        entries: rows.map((r) => ({
          machineId: r.machineId,
          actualProductionMeters: r.actualProductionMeters,
          efficiencyMode: r.efficiencyMode,
          efficiencyPercent: r.efficiencyPercent,
          notes: r.notes?.trim() || undefined,
        })),
      };

      const saved = await ProductionService.saveSheet(payload);
      setCurrentSheet(saved);
      setIsDirty(false);

      if (statusToSet === ProductionSheetStatus.COMPLETED) {
        toast.success('Production sheet successfully completed and locked!');
      } else {
        toast.success('Production sheet draft saved successfully.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save production sheet';
      toast.error(msg);
    } finally {
      setSaving(false);
      setCompleting(false);
    }
  };

  // ── Reopen Sheet ────────────────────────────────────────────────────────────
  const handleReopen = async () => {
    if (!currentSheet) return;
    if (!window.confirm('Are you sure you want to reopen this completed production sheet for editing?')) {
      return;
    }

    setReopening(true);
    try {
      const reopened = await ProductionService.reopenSheet(currentSheet.id);
      setCurrentSheet(reopened);
      toast.success('Production sheet reopened for editing.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reopen production sheet';
      toast.error(msg);
    } finally {
      setReopening(false);
    }
  };

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const handleExportPdf = () => {
    if (!currentSheet && isDirty) {
      toast.warning('Please save the production sheet before exporting.');
      return;
    }

    // Build representation from current or live sheet
    const sheetToExport: ProductionSheet = currentSheet || {
      id: 'preview',
      factoryId: user?.factoryId || '',
      productionDate: selectedDate,
      shift: selectedShift,
      shiftStart: new Date().toISOString(),
      shiftEnd: new Date().toISOString(),
      shiftDurationHours: selectedShift === ShiftType.DAY ? 11 : 13,
      entries: rows.map((r, i) => ({
        id: `row-${i}`,
        machineId: r.machineId,
        machineNumberSnapshot: r.machineNumber,
        machineNameSnapshot: r.machineName,
        fabricId: r.fabricId,
        fabricNameSnapshot: r.fabricName,
        fabricCodeSnapshot: r.fabricCode,
        shift: selectedShift,
        productionDate: selectedDate,
        actualProductionMeters: r.actualProductionMeters,
        efficiencyMode: r.efficiencyMode,
        efficiencyPercent: r.efficiencyPercent,
        rpmSnapshot: r.rpm,
        ppiSnapshot: r.ppi,
        shiftDurationHours: r.shiftDurationHours,
        theoreticalProductionMeters: r.theoreticalProductionMeters,
        machineStatusSnapshot: r.machineStatus,
        notes: r.notes,
      })),
      totalProductionMeters: liveTotals.totalMeters,
      runningMachineCount: liveTotals.running,
      stoppedMachineCount: liveTotals.stopped,
      maintenanceMachineCount: liveTotals.maintenance,
      averageEfficiency: liveTotals.avgEff,
      status: ProductionSheetStatus.DRAFT,
      createdBy: user?.id || '',
      updatedBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    exportProductionSheetPdf({
      sheet: sheetToExport,
      factoryName: user?.factoryName || 'Shree Brahmanikrupa Textile',
      factoryLogo: user?.factoryLogo,
    });
    toast.success('PDF report exported successfully.');
  };

  // ── Excel Export ────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const sheetToExport: ProductionSheet = currentSheet || {
      id: 'preview',
      factoryId: user?.factoryId || '',
      productionDate: selectedDate,
      shift: selectedShift,
      shiftStart: new Date().toISOString(),
      shiftEnd: new Date().toISOString(),
      shiftDurationHours: selectedShift === ShiftType.DAY ? 11 : 13,
      entries: rows.map((r, i) => ({
        id: `row-${i}`,
        machineId: r.machineId,
        machineNumberSnapshot: r.machineNumber,
        machineNameSnapshot: r.machineName,
        fabricId: r.fabricId,
        fabricNameSnapshot: r.fabricName,
        fabricCodeSnapshot: r.fabricCode,
        shift: selectedShift,
        productionDate: selectedDate,
        actualProductionMeters: r.actualProductionMeters,
        efficiencyMode: r.efficiencyMode,
        efficiencyPercent: r.efficiencyPercent,
        rpmSnapshot: r.rpm,
        ppiSnapshot: r.ppi,
        shiftDurationHours: r.shiftDurationHours,
        theoreticalProductionMeters: r.theoreticalProductionMeters,
        machineStatusSnapshot: r.machineStatus,
        notes: r.notes,
      })),
      totalProductionMeters: liveTotals.totalMeters,
      runningMachineCount: liveTotals.running,
      stoppedMachineCount: liveTotals.stopped,
      maintenanceMachineCount: liveTotals.maintenance,
      averageEfficiency: liveTotals.avgEff,
      status: ProductionSheetStatus.DRAFT,
      createdBy: user?.id || '',
      updatedBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    exportProductionSheetExcel({
      sheet: sheetToExport,
      factoryName: user?.factoryName || 'Shree Brahmanikrupa Textile',
    });
    toast.success('Excel spreadsheet exported successfully.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Return to Home"
            >
              <Home className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  SBKT Loom Production
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Phase 7
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">Shift Recording & Efficiency Engine</p>
              </div>
            </div>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="font-semibold text-slate-200">{user?.name}</span>
              <span className="text-[10px] text-slate-400">
                {user?.role ? ROLE_LABELS[user.role as UserRole] : 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Header Toolbar ───────────────────────────────────────────────── */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Status */}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">Production Sheet</h2>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Lock className="w-3 h-3" />
                    COMPLETED & LOCKED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    DRAFT
                  </span>
                )}
                {isDirty && (
                  <span className="text-xs font-semibold text-amber-400 animate-pulse">
                    (Unsaved changes)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Record machine-wise production meters, evaluate automatic theoretical capacity, and audit efficiency.
              </p>
            </div>

            {/* Top Toolbar Controls: Date & Exports */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Input */}
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-lg text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
                />
              </div>

              {/* Export PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-all shadow-sm active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                Export PDF
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-all shadow-sm active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Export Excel
              </button>
            </div>
          </div>

          {/* Shift Switcher & Shift Information Sub-bar */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Shift Buttons */}
            <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleShiftChange(ShiftType.DAY)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedShift === ShiftType.DAY
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                DAY SHIFT
              </button>
              <button
                type="button"
                onClick={() => handleShiftChange(ShiftType.NIGHT)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedShift === ShiftType.NIGHT
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                NIGHT SHIFT
              </button>
            </div>

            {/* Active Details String */}
            <div className="text-xs font-medium text-slate-300 flex items-center gap-2">
              <span className="text-white font-semibold">{formatFriendlyDate(selectedDate)}</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-semibold">{selectedShift} Shift</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono">{getShiftTimingText(selectedShift)}</span>
            </div>
          </div>
        </div>

        {/* ── Content States ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-slate-800 bg-slate-900/40">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Loading production sheet...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-red-500/30 bg-red-500/10 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
            <h3 className="text-base font-semibold text-red-200">Failed to Load Production Data</h3>
            <p className="text-xs text-red-300/80 mt-1 max-w-md">{error}</p>
            <button
              onClick={() => void loadSheetData()}
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <ProductionTable
              rows={rows}
              onChangeRow={handleRowChange}
              isReadOnly={isReadOnly}
            />

            {/* ── Bottom Summary & Actions Bar ─────────────────────────────── */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-2xl backdrop-blur-md space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Total Production */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col">
                  <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                    Total Production
                  </span>
                  <span className="text-xl font-extrabold text-blue-400 font-mono mt-1">
                    {liveTotals.totalMeters.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-medium text-slate-500">m</span>
                  </span>
                </div>

                {/* Running Looms */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col">
                  <span className="text-[11px] uppercase font-semibold text-emerald-400 tracking-wider">
                    Running Looms
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
                    {liveTotals.running}
                  </span>
                </div>

                {/* Stopped Looms */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col">
                  <span className="text-[11px] uppercase font-semibold text-red-400 tracking-wider">
                    Stopped Looms
                  </span>
                  <span className="text-xl font-extrabold text-red-400 font-mono mt-1">
                    {liveTotals.stopped}
                  </span>
                </div>

                {/* Maintenance Looms */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col">
                  <span className="text-[11px] uppercase font-semibold text-amber-400 tracking-wider">
                    Maintenance
                  </span>
                  <span className="text-xl font-extrabold text-amber-400 font-mono mt-1">
                    {liveTotals.maintenance}
                  </span>
                </div>

                {/* Average Efficiency */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col col-span-2 sm:col-span-1">
                  <span className="text-[11px] uppercase font-semibold text-purple-400 tracking-wider">
                    Average Efficiency
                  </span>
                  <span className="text-xl font-extrabold text-purple-400 font-mono mt-1">
                    {liveTotals.avgEff !== null ? `${liveTotals.avgEff.toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>

              {/* Sheet Notes Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Production Sheet Remarks / Shift Log
                </label>
                <textarea
                  rows={2}
                  disabled={isReadOnly}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Record overall shift issues, maintenance remarks, or power downtime..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-60 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500 font-medium">
                  {isCompleted ? (
                    <span className="text-emerald-400/90 flex items-center gap-1.5 font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      Locked sheet. Changes require authorized reopening.
                    </span>
                  ) : (
                    <span>
                      {rows.length} looms registered for recording. Enter meters to compute efficiency.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Reopen Button for Admin/Manager when completed */}
                  {isCompleted && canReopen && (
                    <button
                      type="button"
                      onClick={handleReopen}
                      disabled={reopening}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      {reopening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                      Reopen Sheet
                    </button>
                  )}

                  {/* Save Draft Button */}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleSave(ProductionSheetStatus.DRAFT)}
                      disabled={saving || completing}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-blue-400" />}
                      Save Draft
                    </button>
                  )}

                  {/* Complete Sheet Button */}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleSave(ProductionSheetStatus.COMPLETED)}
                      disabled={saving || completing}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Complete Sheet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
