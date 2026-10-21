import React from 'react';
import { X, Layers, CheckCircle2, XCircle, Tag, Ruler } from 'lucide-react';
import type { Fabric } from '../types/fabric.types';

interface FabricDetailDialogProps {
  fabric: Fabric | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (fabric: Fabric) => void;
  canManage?: boolean;
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2.5 px-3 border-b border-slate-800/60 last:border-0 text-xs">
    <span className="text-slate-400 font-medium">{label}</span>
    <span className="text-slate-100 font-medium">{value ?? '—'}</span>
  </div>
);

export const FabricDetailDialog: React.FC<FabricDetailDialogProps> = ({
  fabric,
  isOpen,
  onClose,
  onEdit,
  canManage,
}) => {
  if (!isOpen || !fabric) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--color-surface-900, #0f172a)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{fabric.name}</h3>
              <p className="text-xs font-mono text-teal-400">{fabric.code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status badge banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-xs text-slate-400">Status</span>
            {fabric.isActive ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> Active Specification
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
                <XCircle size={11} /> Inactive Specification
              </span>
            )}
          </div>

          {/* Description */}
          {fabric.description && (
            <div
              className="p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {fabric.description}
            </div>
          )}

          {/* Specification Section */}
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2 flex items-center gap-1.5">
              <Ruler size={10} /> Fabric Specifications
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-800/60">
              <DetailRow label="PPI" value={`${fabric.ppi} picks/inch`} />
              <DetailRow label="Panno" value={fabric.panno} />
              <DetailRow
                label="Wastage"
                value={
                  <span
                    className={`font-semibold ${
                      fabric.wastagePercent > 5 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {fabric.wastagePercent}%
                  </span>
                }
              />
              {fabric.recommendedRpm !== undefined && (
                <DetailRow label="Rec. RPM" value={`${fabric.recommendedRpm} RPM`} />
              )}
            </div>
          </div>

          {/* Yarn Reference IDs Section */}
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2 flex items-center gap-1.5">
              <Tag size={10} /> Yarn References
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-800/60">
              <DetailRow
                label="Warp Yarn ID"
                value={<span className="font-mono text-blue-300">{fabric.warpYarnId}</span>}
              />
              <DetailRow
                label="Weft Yarn ID"
                value={<span className="font-mono text-cyan-300">{fabric.weftYarnId}</span>}
              />
            </div>
          </div>

          {/* Audit Section */}
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2">
              Audit Information
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-800/60">
              <DetailRow
                label="Created"
                value={new Date(fabric.createdAt).toLocaleString()}
              />
              <DetailRow
                label="Last Updated"
                value={new Date(fabric.updatedAt).toLocaleString()}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
          >
            Close
          </button>
          {canManage && onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(fabric);
              }}
              className="px-4 py-2 text-sm rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium transition cursor-pointer"
            >
              Edit Fabric
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
