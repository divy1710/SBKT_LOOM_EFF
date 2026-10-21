import React from 'react';
import { X, Layers, Calendar, DollarSign, Tag, Info, CheckCircle, XCircle } from 'lucide-react';
import type { Yarn } from '../types/yarn.types';
import { formatDate } from '@/lib/utils';

interface YarnDetailDialogProps {
  yarn: Yarn | null;
  isOpen: boolean;
  onClose: () => void;
}

export const YarnDetailDialog: React.FC<YarnDetailDialogProps> = ({
  yarn,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !yarn) return null;

  const typeBadgeColors = {
    WARP: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    WEFT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    BOTH: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--color-surface-900, #0f172a)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Yarn Specification</h3>
              <p className="text-xs text-slate-400">Full specification details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Main Name & Status */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Yarn Name
              </span>
              <h2 className="text-xl font-bold text-slate-100 mt-0.5">{yarn.name}</h2>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  yarn.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-700/40 text-slate-400 border-slate-700'
                }`}
              >
                {yarn.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {yarn.isActive ? 'Active' : 'Inactive'}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                  typeBadgeColors[yarn.yarnType]
                }`}
              >
                {yarn.yarnType}
              </span>
            </div>
          </div>

          {/* Grid Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Tag size={13} className="text-slate-500" />
                <span>Denier</span>
              </div>
              <p className="text-lg font-semibold text-slate-200">{yarn.denier} D</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <DollarSign size={13} className="text-slate-500" />
                <span>Rate & Unit</span>
              </div>
              <p className="text-lg font-semibold text-slate-200">
                ₹{yarn.rate.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-400">/ {yarn.rateUnit}</span>
              </p>
            </div>
          </div>

          {/* Description */}
          {yarn.description ? (
            <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Info size={13} className="text-slate-500" />
                <span>Description</span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{yarn.description}</p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-800/20 border border-dashed border-slate-800 text-xs text-slate-500 italic">
              No description provided for this yarn.
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Created: {formatDate(yarn.createdAt)}
            </span>
            <span>Last updated: {formatDate(yarn.updatedAt)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
