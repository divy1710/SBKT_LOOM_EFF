import React from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import type { Yarn } from '../types/yarn.types';

interface YarnStatusDialogProps {
  yarn: Yarn | null;
  isOpen: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const YarnStatusDialog: React.FC<YarnStatusDialogProps> = ({
  yarn,
  isOpen,
  isUpdating,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !yarn) return null;

  const isDeactivating = yarn.isActive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden"
        style={{ background: 'var(--color-surface-900, #0f172a)' }}
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              isDeactivating ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {isDeactivating ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isDeactivating ? 'Deactivate Yarn' : 'Activate Yarn'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Are you sure you want to {isDeactivating ? 'deactivate' : 'reactivate'}{' '}
              <strong className="text-slate-200">"{yarn.name}"</strong> ({yarn.denier}D,{' '}
              {yarn.yarnType})?
            </p>
          </div>
        </div>

        {isDeactivating ? (
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300/90 mb-5 leading-relaxed">
            <strong>Important note:</strong> Deactivating this yarn hides it from new fabric or
            beam selection dropdowns. Historical production records and efficiency analytics will
            remain completely preserved.
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-emerald-300/90 mb-5 leading-relaxed">
            Reactivating this yarn restores its availability in future fabric and beam selection
            dropdowns.
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isUpdating}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 ${
              isDeactivating
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isUpdating && <Loader2 size={15} className="animate-spin" />}
            {isDeactivating ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};
