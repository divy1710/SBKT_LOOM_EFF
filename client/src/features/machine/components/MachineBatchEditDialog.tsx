import React, { useState, useEffect } from 'react';
import { X, Loader2, Layers, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Machine, BatchUpdateMachineInput, BatchUpdateResult } from '../types/machine.types';
import { MachineService, type FabricOption } from '../services/machine.service';

interface MachineBatchEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMachines: Machine[];
  onSubmit: (data: BatchUpdateMachineInput) => Promise<BatchUpdateResult>;
  onSuccess: () => void;
}

export const MachineBatchEditDialog: React.FC<MachineBatchEditDialogProps> = ({
  isOpen,
  onClose,
  selectedMachines,
  onSubmit,
  onSuccess,
}) => {
  // Field toggles
  const [updateFabric, setUpdateFabric] = useState(false);
  const [updateRpm, setUpdateRpm] = useState(false);
  const [updatePpi, setUpdatePpi] = useState(false);
  const [updateNotes, setUpdateNotes] = useState(false);

  // Field values
  const [fabricId, setFabricId] = useState('');
  const [rpm, setRpm] = useState<number | ''>(700);
  const [ppi, setPpi] = useState<number | ''>(68);
  const [notes, setNotes] = useState('');

  // Dropdown options
  const [fabrics, setFabrics] = useState<FabricOption[]>([]);
  const [loadingFabrics, setLoadingFabrics] = useState(false);
  const [fabricsError, setFabricsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Fabrics with Retry
  const loadFabrics = React.useCallback(async () => {
    setLoadingFabrics(true);
    setFabricsError(null);
    try {
      const data = await MachineService.getActiveFabrics();
      setFabrics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load fabric options.';
      setFabricsError(msg);
      toast.error(msg);
    } finally {
      setLoadingFabrics(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadFabrics();
    }
  }, [isOpen, loadFabrics]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setUpdateFabric(false);
      setUpdateRpm(false);
      setUpdatePpi(false);
      setUpdateNotes(false);
      setFabricId('');
      setRpm(700);
      setPpi(68);
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!updateFabric && !updateRpm && !updatePpi && !updateNotes) {
      setError('Please select at least one field to batch update.');
      return;
    }

    if (updateFabric && !fabricId) {
      setError('Please select a fabric quality to assign.');
      return;
    }
    if (updateRpm && (typeof rpm !== 'number' || rpm <= 0)) {
      setError('RPM must be a positive number.');
      return;
    }
    if (updatePpi && (typeof ppi !== 'number' || ppi <= 0)) {
      setError('PPI must be a positive number.');
      return;
    }

    const payload: BatchUpdateMachineInput = {
      machineIds: selectedMachines.map((m) => m.id),
      updates: {},
    };

    if (updateFabric) payload.updates.fabricId = fabricId;
    if (updateRpm && typeof rpm === 'number') payload.updates.rpm = rpm;
    if (updatePpi && typeof ppi === 'number') payload.updates.ppi = ppi;
    if (updateNotes) payload.updates.notes = notes.trim() || undefined;

    setSubmitting(true);
    try {
      const result = await onSubmit(payload);
      if (result.failedCount > 0) {
        toast.warning(
          `Batch update completed: ${result.updatedCount} succeeded, ${result.failedCount} failed.`,
        );
      } else {
        toast.success(`Successfully batch updated ${result.updatedCount} machines.`);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Batch update failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const machineNumbersList = selectedMachines.map((m) => m.machineNumber).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-display flex items-center gap-2">
              <Layers size={18} className="text-teal-400" />
              Batch Edit Machines ({selectedMachines.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1" title={machineNumbersList}>
              Target looms: {machineNumbersList}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-slate-300">
            Check only the fields you wish to modify across all {selectedMachines.length} selected machines.
            Unchecked fields will remain untouched.
          </p>

          {/* 1. Update Fabric Quality */}
          <div
            className={`p-3.5 rounded-xl border transition ${
              updateFabric
                ? 'bg-slate-800/80 border-teal-500/40'
                : 'bg-slate-950/40 border-slate-800/80'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateFabric}
                onChange={(e) => setUpdateFabric(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/20 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-200">Update Fabric Quality</span>
            </label>

            {updateFabric && (
              <div className="mt-3 pl-6">
                {loadingFabrics ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 size={13} className="animate-spin text-teal-400" />
                    <span>Loading fabrics...</span>
                  </div>
                ) : fabricsError ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{fabricsError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadFabrics()}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px] font-semibold border border-slate-700 transition"
                    >
                      Retry
                    </button>
                  </div>
                ) : fabrics.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                    No active fabrics found. Add or activate a fabric in Fabric Master.
                  </div>
                ) : (
                  <select
                    value={fabricId}
                    onChange={(e) => {
                      setFabricId(e.target.value);
                      const f = fabrics.find((fab) => fab.id === e.target.value);
                      if (f && updatePpi) setPpi(f.ppi);
                      if (f?.recommendedRpm && updateRpm) setRpm(f.recommendedRpm);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition cursor-pointer"
                    required={updateFabric}
                  >
                    <option value="">Select Fabric Quality...</option>
                    {fabrics.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} — {f.code}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* 2. Update Operating RPM */}
          <div
            className={`p-3.5 rounded-xl border transition ${
              updateRpm
                ? 'bg-slate-800/80 border-teal-500/40'
                : 'bg-slate-950/40 border-slate-800/80'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateRpm}
                onChange={(e) => setUpdateRpm(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/20 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-200">Update Operating RPM</span>
            </label>

            {updateRpm && (
              <div className="mt-3 pl-6">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={rpm}
                  onChange={(e) => setRpm(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 720"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                  required={updateRpm}
                />
              </div>
            )}
          </div>

          {/* 3. Update Configured PPI */}
          <div
            className={`p-3.5 rounded-xl border transition ${
              updatePpi
                ? 'bg-slate-800/80 border-teal-500/40'
                : 'bg-slate-950/40 border-slate-800/80'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updatePpi}
                onChange={(e) => setUpdatePpi(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/20 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-200">Update Configured PPI</span>
            </label>

            {updatePpi && (
              <div className="mt-3 pl-6">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={ppi}
                  onChange={(e) => setPpi(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 68"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                  required={updatePpi}
                />
              </div>
            )}
          </div>

          {/* 4. Update Notes */}
          <div
            className={`p-3.5 rounded-xl border transition ${
              updateNotes
                ? 'bg-slate-800/80 border-teal-500/40'
                : 'bg-slate-950/40 border-slate-800/80'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/20 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-200">Update Notes</span>
            </label>

            {updateNotes && (
              <div className="mt-3 pl-6">
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bulk adjusted PPI for current sort order"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 transition resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 transition shadow-lg shadow-teal-500/20"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Apply Batch Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
