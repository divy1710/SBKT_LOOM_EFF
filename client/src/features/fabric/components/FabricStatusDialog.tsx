import React from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Fabric } from '../types/fabric.types';

interface FabricStatusDialogProps {
  fabric: Fabric | null;
  isOpen: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const FabricStatusDialog: React.FC<FabricStatusDialogProps> = ({
  fabric,
  isOpen,
  isUpdating,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !fabric) return null;

  const isDeactivating = fabric.isActive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          background: 'var(--color-surface-900, #0f172a)',
          borderColor: isDeactivating
            ? 'rgba(239,68,68,0.3)'
            : 'rgba(16,185,129,0.3)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            borderColor: isDeactivating ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDeactivating ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {isDeactivating ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <h3 className="text-base font-bold text-slate-100">
              {isDeactivating ? 'Deactivate Fabric' : 'Activate Fabric'}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <AlertTriangle
                size={18}
                className={isDeactivating ? 'text-amber-400' : 'text-emerald-400'}
              />
            </div>
            <div>
              <p className="text-sm text-slate-200 font-medium mb-1">
                {isDeactivating
                  ? `Deactivating "${fabric.name}" will hide it from production planning.`
                  : `Activating "${fabric.name}" will make it available for production.`}
              </p>
              <div className="text-xs text-slate-400 space-y-1">
                <p>
                  Fabric Code:{' '}
                  <span className="font-mono text-teal-300 font-semibold">{fabric.code}</span>
                </p>
                {isDeactivating && (
                  <p>
                    <span className="text-amber-400">Note:</span> Existing production records
                    referencing this fabric will not be affected.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
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
                ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
            }`}
          >
            {isUpdating && <Loader2 size={14} className="animate-spin" />}
            {isDeactivating ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};
