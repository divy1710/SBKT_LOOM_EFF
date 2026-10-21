import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Beam } from '../types/beam.types';
import { BeamStatus } from '../types/beam.types';

interface BeamLoadDialogProps {
  beam: Beam | null;
  mode: 'load' | 'unload';
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onLoadSubmit: (machineNumber?: string, notes?: string) => Promise<void>;
  onUnloadSubmit: (
    outcomeStatus: BeamStatus.IN_GODOWN | BeamStatus.FINISHED | BeamStatus.SHORTAGE,
    endingMeters?: number,
    notes?: string,
  ) => Promise<void>;
}

export const BeamLoadDialog: React.FC<BeamLoadDialogProps> = ({
  beam,
  mode,
  isOpen,
  isSubmitting,
  onClose,
  onLoadSubmit,
  onUnloadSubmit,
}) => {
  const [machineNumber, setMachineNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState<
    BeamStatus.IN_GODOWN | BeamStatus.FINISHED | BeamStatus.SHORTAGE
  >(BeamStatus.IN_GODOWN);
  const [endingMeters, setEndingMeters] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (beam && isOpen) {
      setMachineNumber(beam.loadedMachineNumber || '');
      setNotes('');
      setEndingMeters(beam.remainingLengthMeters);
      setOutcomeStatus(
        beam.remainingLengthMeters === 0 ? BeamStatus.FINISHED : BeamStatus.IN_GODOWN,
      );
      setError(null);
    }
  }, [beam, isOpen, mode]);

  if (!isOpen || !beam) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'load') {
      await onLoadSubmit(machineNumber.trim() || undefined, notes.trim() || undefined);
    } else {
      if (endingMeters < 0) {
        setError('Ending meters cannot be negative');
        return;
      }
      if (endingMeters > beam.remainingLengthMeters) {
        setError(
          `Ending meters (${endingMeters}m) cannot exceed remaining meters (${beam.remainingLengthMeters}m)`,
        );
        return;
      }
      await onUnloadSubmit(outcomeStatus, endingMeters, notes.trim() || undefined);
    }
  };

  const isLoad = mode === 'load';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface-900, #0f172a)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isLoad ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {isLoad ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {isLoad ? 'Load Beam onto Machine' : 'Unload Beam from Machine'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">Beam: {beam.beamNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoad ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Loom / Machine Number <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={machineNumber}
                  onChange={(e) => setMachineNumber(e.target.value)}
                  placeholder="e.g. WJ-01 or Loom 12"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 space-y-1">
                <div>
                  Starting meters: <strong className="text-slate-200 font-mono">{beam.remainingLengthMeters} m</strong>
                </div>
                <div>
                  Quality: <strong className="text-slate-200">{beam.fabric?.name || '—'}</strong>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Ending Remaining Meters <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={beam.remainingLengthMeters}
                  value={endingMeters}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEndingMeters(val);
                    if (val === 0) setOutcomeStatus(BeamStatus.FINISHED);
                  }}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Current: {beam.remainingLengthMeters}m | Used this run:{' '}
                  {Math.max(0, beam.remainingLengthMeters - endingMeters)}m
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Outcome Status <span className="text-rose-400">*</span>
                </label>
                <select
                  value={outcomeStatus}
                  onChange={(e) =>
                    setOutcomeStatus(
                      e.target.value as
                        | BeamStatus.IN_GODOWN
                        | BeamStatus.FINISHED
                        | BeamStatus.SHORTAGE,
                    )
                  }
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value={BeamStatus.IN_GODOWN}>Return to Godown (Partial Run)</option>
                  <option value={BeamStatus.FINISHED}>Finished (All Meters Consumed)</option>
                  <option value={BeamStatus.SHORTAGE}>Shortage (Damaged / Cut Early)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Event Notes <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add loading or unloading remarks…"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition shadow-lg cursor-pointer ${
                isLoad
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
              }`}
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isLoad ? 'Confirm Load' : 'Confirm Unload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
