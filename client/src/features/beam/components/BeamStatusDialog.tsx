import React from 'react';
import { X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Beam } from '../types/beam.types';

interface BeamStatusDialogProps {
  beam: Beam | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const BeamStatusDialog: React.FC<BeamStatusDialogProps> = ({
  beam,
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !beam) return null;

  const isActivating = !beam.isActive;

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
                isActivating ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {isActivating ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <h3 className="text-base font-bold text-slate-100">
              {isActivating ? 'Activate Beam' : 'Deactivate Beam'}
            </h3>
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

        {/* Body */}
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            Are you sure you want to {isActivating ? 'activate' : 'deactivate'} beam{' '}
            <strong className="text-teal-300 font-mono font-bold">{beam.beamNumber}</strong>?
          </p>
          {!isActivating && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              Deactivated beams will be hidden from new floor allocations and production sheets, but all historical loading records are strictly preserved.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition shadow-lg cursor-pointer ${
              isActivating
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
            }`}
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            {isActivating ? 'Activate Beam' : 'Deactivate Beam'}
          </button>
        </div>
      </div>
    </div>
  );
};
