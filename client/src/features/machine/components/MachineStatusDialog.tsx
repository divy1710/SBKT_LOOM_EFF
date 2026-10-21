import React, { useState } from 'react';
import { X, Loader2, Play, Square, Wrench, AlertCircle } from 'lucide-react';
import type { Machine, UpdateMachineStatusInput } from '../types/machine.types';
import { MachineStatus } from '../types/machine.types';

interface MachineStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  onSubmit: (machineId: string, data: UpdateMachineStatusInput) => Promise<void>;
}

export const MachineStatusDialog: React.FC<MachineStatusDialogProps> = ({
  isOpen,
  onClose,
  machine,
  onSubmit,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus>(
    machine?.status || MachineStatus.STOPPED,
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (machine) {
      setSelectedStatus(machine.status);
      setNotes('');
      setError(null);
    }
  }, [machine, isOpen]);

  if (!isOpen || !machine) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await onSubmit(machine.id, {
        status: selectedStatus,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update machine status';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = [
    {
      value: MachineStatus.RUNNING,
      title: 'Running',
      desc: 'Machine is actively operating and producing fabric.',
      icon: Play,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      value: MachineStatus.STOPPED,
      title: 'Stopped',
      desc: 'Machine is idle between shifts, waiting for yarn, or stopped by operator.',
      icon: Square,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      value: MachineStatus.MAINTENANCE,
      title: 'Maintenance',
      desc: 'Undergoing mechanical repair, preventive check, or oiling. Cannot load new beams.',
      icon: Wrench,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display">
              Change Machine Status: {machine.machineNumber}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select current operational state for {machine.name}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Cards */}
          <div className="space-y-2.5">
            {statusOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedStatus === opt.value;

              return (
                <div
                  key={opt.value}
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    isSelected
                      ? `bg-slate-800/90 border-teal-500 ring-1 ring-teal-500`
                      : 'bg-slate-800/30 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`p-2 rounded-lg border ${opt.color} mt-0.5`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200">{opt.title}</span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason / Status Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Changed weft feeder sensor, resumed production"
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 transition resize-none"
            />
          </div>

          {/* Footer */}
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 transition shadow-lg shadow-teal-500/20"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Update Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
