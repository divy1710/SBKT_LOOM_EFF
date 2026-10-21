import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Disc,
  Gauge,
  Percent,
  Clock,
  Edit2,
  Power,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole } from '@/features/auth/types/auth.types';
import type {
  Machine,
  UpdateMachineInput,
  UpdateMachineStatusInput,
  MachineLoadBeamInput,
  MachineUnloadBeamInput,
} from '../types/machine.types';
import { MachineStatus, MACHINE_STATUS_CONFIG } from '../types/machine.types';
import { MachineService } from '../services/machine.service';
import { MachineFormDialog } from '../components/MachineFormDialog';
import { MachineStatusDialog } from '../components/MachineStatusDialog';
import { MachineLoadBeamDialog } from '../components/MachineLoadBeamDialog';
import { MachineUnloadBeamDialog } from '../components/MachineUnloadBeamDialog';

export const MachineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const canManage = Boolean(
    user &&
      (user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.FACTORY_ADMIN ||
        user.role === UserRole.MANAGER),
  );
  const canOperate = Boolean(
    user &&
      (user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.FACTORY_ADMIN ||
        user.role === UserRole.MANAGER ||
        user.role === UserRole.OPERATOR),
  );

  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [loadBeamOpen, setLoadBeamOpen] = useState(false);
  const [unloadBeamOpen, setUnloadBeamOpen] = useState(false);

  const fetchMachine = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await MachineService.getMachineById(id);
      setMachine(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load machine';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchMachine();
  }, [fetchMachine]);

  const handleEditSubmit = async (data: UpdateMachineInput) => {
    if (!id) return;
    await MachineService.updateMachine(id, data);
    toast.success('Machine updated successfully.');
    void fetchMachine();
  };

  const handleStatusSubmit = async (_machineId: string, data: UpdateMachineStatusInput) => {
    if (!id) return;
    await MachineService.updateMachineStatus(id, data);
    toast.success('Machine status updated successfully.');
    void fetchMachine();
  };

  const handleLoadBeamSubmit = async (machineId: string, data: MachineLoadBeamInput) => {
    await MachineService.loadBeam(machineId, data);
    void fetchMachine();
  };

  const handleUnloadBeamSubmit = async (machineId: string, data: MachineUnloadBeamInput) => {
    await MachineService.unloadBeam(machineId, data);
    void fetchMachine();
  };

  const handleToggleActive = async () => {
    if (!id || !machine) return;
    try {
      const updated = await MachineService.toggleMachineActive(id);
      const actionLabel = updated.isActive ? 'activated' : 'deactivated';
      toast.success(`Machine ${machine.machineNumber} ${actionLabel}.`);
      void fetchMachine();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 size={32} className="animate-spin text-teal-400" />
        <p className="text-xs">Loading machine details...</p>
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <AlertCircle size={36} className="mx-auto text-rose-400" />
          <h2 className="text-base font-bold text-slate-100">Machine Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'The requested machine could not be retrieved.'}</p>
          <Link
            to="/machines"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            <ArrowLeft size={14} /> Back to Machine List
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = MACHINE_STATUS_CONFIG[machine.status];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Top Navigation Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link
              to="/machines"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition font-medium"
            >
              <ArrowLeft size={14} />
              <span>Back to Machines</span>
            </Link>
            <span className="text-slate-700">/</span>
            <span className="font-mono text-sm font-bold text-teal-400">
              {machine.machineNumber}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {canOperate && (
              <button
                onClick={() => setStatusOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Power size={13} className="text-amber-400" />
                <span>Change Status</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 transition shadow-lg shadow-teal-500/20"
              >
                <Edit2 size={13} />
                <span>Edit Machine</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Body ──────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Machine Identity Banner */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono text-slate-100 tracking-tight">
                {machine.machineNumber}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
              {!machine.isActive && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  Deactivated
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 font-medium">{machine.name}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canOperate && !machine.loadedBeamId && machine.status !== MachineStatus.MAINTENANCE && machine.isActive && (
              <button
                onClick={() => setLoadBeamOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
              >
                <Disc size={14} />
                <span>Load Beam</span>
              </button>
            )}

            {canOperate && machine.loadedBeamId && (
              <button
                onClick={() => setUnloadBeamOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
              >
                <Disc size={14} />
                <span>Unload Current Beam</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={handleToggleActive}
                disabled={Boolean(machine.isActive && machine.loadedBeamId)}
                title={
                  machine.isActive && machine.loadedBeamId
                    ? 'Unload beam before deactivating machine'
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                  machine.isActive
                    ? 'border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                    : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                } ${machine.isActive && machine.loadedBeamId ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <RotateCcw size={13} />
                <span>{machine.isActive ? 'Deactivate Machine' : 'Reactivate Machine'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 4 Summary Cards (Required) ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Pick Per Inch (PPI) */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Configured PPI</span>
              <Gauge size={16} className="text-teal-400" />
            </div>
            <div className="text-3xl font-black font-mono text-slate-100">
              {machine.ppi}
            </div>
            <p className="text-[11px] text-slate-400">Picks per inch weave density</p>
          </div>

          {/* 2. RPM */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Operating RPM</span>
              <Gauge size={16} className="text-cyan-400" />
            </div>
            <div className="text-3xl font-black font-mono text-slate-100">
              {machine.rpm}
            </div>
            <p className="text-[11px] text-slate-400">Current machine speed calibration</p>
          </div>

          {/* 3. Efficiency Placeholder (No production data yet) */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Shift Efficiency</span>
              <Percent size={16} className="text-slate-500" />
            </div>
            <div className="text-base font-bold text-slate-400 italic mt-2">
              No production data yet
            </div>
            <p className="text-[11px] text-slate-400">
              Linked to Shift Production Sheets in Phase 7
            </p>
          </div>

          {/* 4. Loaded Beam */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Loaded Beam</span>
              <Disc size={16} className={machine.loadedBeam ? 'text-teal-400' : 'text-slate-500'} />
            </div>
            {machine.loadedBeam ? (
              <div>
                <div className="text-xl font-black font-mono text-teal-300">
                  {machine.loadedBeam.beamNumber}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  {machine.loadedBeam.remainingLengthMeters.toLocaleString()} m /{' '}
                  {machine.loadedBeam.originalLengthMeters.toLocaleString()} m remaining
                </p>
              </div>
            ) : (
              <div className="text-base font-bold text-slate-400 italic mt-2">
                No beam loaded
              </div>
            )}
          </div>
        </div>

        {/* ── Detailed Information Sections ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fabric Specifications */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers size={16} className="text-teal-400" />
              Assigned Fabric Quality
            </h3>

            {machine.fabric ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Quality Name</span>
                  <span className="font-semibold text-slate-200">{machine.fabric.name}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Fabric Code</span>
                  <span className="font-mono font-bold text-teal-300 bg-slate-800 px-2 py-0.5 rounded">
                    {machine.fabric.code}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Fabric Default PPI</span>
                  <span className="font-mono text-slate-200">{machine.fabric.ppi} PPI</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Fabric Panno (Width)</span>
                  <span className="font-mono text-slate-200">{machine.fabric.panno}&quot;</span>
                </div>
                {machine.fabric.recommendedRpm && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-400">Fabric Recommended RPM</span>
                    <span className="font-mono text-slate-200">{machine.fabric.recommendedRpm} RPM</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No fabric quality assigned to this machine.</p>
            )}
          </div>

          {/* Machine Metadata & Audit Info */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clock size={16} className="text-teal-400" />
              Machine Metadata & Audit
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Created At</span>
                <span className="text-slate-200">
                  {new Date(machine.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Last Updated</span>
                <span className="text-slate-200">
                  {new Date(machine.updatedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Record Status</span>
                <span className={machine.isActive ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                  {machine.isActive ? 'Active Record' : 'Deactivated Record'}
                </span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Notes / Remarks:</span>
                <p className="text-slate-300 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                  {machine.notes || 'No notes specified.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Dialog Modals ──────────────────────────────────────────────────── */}
      {editOpen && (
        <MachineFormDialog
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSubmit={handleEditSubmit}
          initialData={machine}
        />
      )}

      {statusOpen && (
        <MachineStatusDialog
          isOpen={statusOpen}
          onClose={() => setStatusOpen(false)}
          machine={machine}
          onSubmit={handleStatusSubmit}
        />
      )}

      {loadBeamOpen && (
        <MachineLoadBeamDialog
          isOpen={loadBeamOpen}
          onClose={() => setLoadBeamOpen(false)}
          machine={machine}
          onSubmit={handleLoadBeamSubmit}
        />
      )}

      {unloadBeamOpen && (
        <MachineUnloadBeamDialog
          isOpen={unloadBeamOpen}
          onClose={() => setUnloadBeamOpen(false)}
          machine={machine}
          onSubmit={handleUnloadBeamSubmit}
        />
      )}
    </div>
  );
};
