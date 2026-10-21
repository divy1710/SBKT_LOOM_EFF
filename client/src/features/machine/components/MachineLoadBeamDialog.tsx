import React, { useState, useEffect } from 'react';
import { X, Loader2, Disc, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Machine, MachineLoadBeamInput } from '../types/machine.types';
import { MachineService, type AvailableBeamOption } from '../services/machine.service';

interface MachineLoadBeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  onSubmit: (machineId: string, data: MachineLoadBeamInput) => Promise<void>;
}

export const MachineLoadBeamDialog: React.FC<MachineLoadBeamDialogProps> = ({
  isOpen,
  onClose,
  machine,
  onSubmit,
}) => {
  const [beamId, setBeamId] = useState('');
  const [notes, setNotes] = useState('');
  const [availableBeams, setAvailableBeams] = useState<AvailableBeamOption[]>([]);
  const [loadingBeams, setLoadingBeams] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !machine) return;

    let mounted = true;
    setLoadingBeams(true);
    setBeamId('');
    setNotes('');
    setError(null);

    MachineService.getAvailableBeams()
      .then((beams) => {
        if (mounted) setAvailableBeams(beams);
      })
      .catch(() => {
        toast.error('Failed to load available godown beams.');
      })
      .finally(() => {
        if (mounted) setLoadingBeams(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, machine]);

  if (!isOpen || !machine) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!beamId) {
      setError('Please select a beam to load onto the machine.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(machine.id, {
        beamId,
        notes: notes.trim() || undefined,
      });
      toast.success(`Beam loaded onto machine ${machine.machineNumber} successfully.`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load beam';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBeam = availableBeams.find((b) => b.id === beamId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
              <Disc size={17} className="text-teal-400" />
              Load Beam onto {machine.machineNumber}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Assign an available Godown beam to this active loom.
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

          {/* Machine Info Card */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Machine:</span>
              <span className="font-semibold text-slate-200">
                {machine.machineNumber} — {machine.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fabric Quality:</span>
              <span className="font-semibold text-teal-400">
                {machine.fabric ? `${machine.fabric.name} (${machine.fabric.code})` : 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Beam Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Available Beam <span className="text-rose-400">*</span>
            </label>
            {loadingBeams ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 size={14} className="animate-spin text-teal-400" />
                <span>Loading available godown beams...</span>
              </div>
            ) : availableBeams.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                No available beams currently in Godown. Please create or finish beams first.
              </div>
            ) : (
              <select
                value={beamId}
                onChange={(e) => setBeamId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition cursor-pointer"
                required
              >
                <option value="">Select a beam...</option>
                {availableBeams.map((b) => (
                  <option key={b.id} value={b.id}>
                    Beam {b.beamNumber} {b.pipeNumber ? `(${b.pipeNumber})` : ''} — {b.remainingLengthMeters.toLocaleString()} m
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Starting Meters preview */}
          {selectedBeam && (
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs">
              <span className="text-teal-300 font-semibold">Starting Meters:</span>{' '}
              <span className="font-mono text-slate-100 font-bold">
                {selectedBeam.remainingLengthMeters.toLocaleString()} m
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Loading Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Loaded for Shift A by operator"
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
              disabled={submitting || availableBeams.length === 0 || !beamId}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 transition shadow-lg shadow-teal-500/20"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Confirm & Load Beam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
