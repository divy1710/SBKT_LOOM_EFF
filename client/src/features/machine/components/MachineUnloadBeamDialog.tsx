import React, { useState, useEffect } from 'react';
import { X, Loader2, Disc, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Machine, MachineUnloadBeamInput } from '../types/machine.types';

interface MachineUnloadBeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  onSubmit: (machineId: string, data: MachineUnloadBeamInput) => Promise<void>;
}

export const MachineUnloadBeamDialog: React.FC<MachineUnloadBeamDialogProps> = ({
  isOpen,
  onClose,
  machine,
  onSubmit,
}) => {
  const currentRemaining = machine?.loadedBeam?.remainingLengthMeters ?? 0;

  const [endingMeters, setEndingMeters] = useState<number | ''>(currentRemaining);
  const [outcomeStatus, setOutcomeStatus] = useState<'IN_GODOWN' | 'FINISHED' | 'SHORTAGE'>(
    'IN_GODOWN',
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (machine?.loadedBeam) {
      setEndingMeters(machine.loadedBeam.remainingLengthMeters);
      setOutcomeStatus('IN_GODOWN');
      setNotes('');
      setError(null);
    }
  }, [machine, isOpen]);

  if (!isOpen || !machine || !machine.loadedBeam) return null;

  const usedMeters =
    typeof endingMeters === 'number'
      ? Math.max(0, currentRemaining - endingMeters)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine?.loadedBeam) return;
    setError(null);

    if (typeof endingMeters !== 'number' || endingMeters < 0) {
      setError('Ending meters must be a non-negative number.');
      return;
    }

    if (endingMeters > currentRemaining) {
      setError(
        `Ending meters (${endingMeters} m) cannot exceed current remaining meters (${currentRemaining} m).`,
      );
      return;
    }

    const beamNumber = machine.loadedBeam.beamNumber;
    setSubmitting(true);
    try {
      await onSubmit(machine.id, {
        endingMeters,
        outcomeStatus,
        notes: notes.trim() || undefined,
      });
      toast.success(
        `Beam ${beamNumber} successfully unloaded from ${machine.machineNumber}.`,
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unload beam';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
              <Disc size={17} className="text-rose-400" />
              Unload Beam from {machine.machineNumber}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record final cut/dof meters and choose the beam outcome status.
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Loaded Beam Info */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Beam Number:</span>
              <span className="font-mono font-bold text-teal-300">
                {machine.loadedBeam.beamNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Original Length:</span>
              <span className="font-mono text-slate-200">
                {machine.loadedBeam.originalLengthMeters.toLocaleString()} m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Remaining:</span>
              <span className="font-mono font-semibold text-slate-100">
                {currentRemaining.toLocaleString()} m
              </span>
            </div>
          </div>

          {/* Ending Meters */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ending Meter Reading (Meters Remaining on Beam) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              max={currentRemaining}
              value={endingMeters}
              onChange={(e) =>
                setEndingMeters(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-teal-500 transition"
              required
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Produced / Used Meters:</span>
              <span className="font-mono font-bold text-teal-400">
                {usedMeters.toLocaleString()} m
              </span>
            </div>
          </div>

          {/* Outcome Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Beam Outcome Status <span className="text-rose-400">*</span>
            </label>
            <select
              value={outcomeStatus}
              onChange={(e) =>
                setOutcomeStatus(e.target.value as 'IN_GODOWN' | 'FINISHED' | 'SHORTAGE')
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition cursor-pointer"
            >
              <option value="IN_GODOWN">Return to Godown (Partially run, available for reload)</option>
              <option value="FINISHED">Finished (Beam is empty / completed)</option>
              <option value="SHORTAGE">Shortage (Beam ended short or has defects)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Unloading Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Doffed beam at shift end"
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 transition resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition shadow-lg shadow-rose-500/20"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Confirm & Unload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
