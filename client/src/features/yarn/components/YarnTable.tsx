import React from 'react';
import { Eye, Edit3, Power, CheckCircle2, XCircle } from 'lucide-react';
import type { Yarn } from '../types/yarn.types';
import { formatDate } from '@/lib/utils';

interface YarnTableProps {
  yarns: Yarn[];
  startIndex: number;
  canManage: boolean;
  onView: (yarn: Yarn) => void;
  onEdit: (yarn: Yarn) => void;
  onToggleStatus: (yarn: Yarn) => void;
}

const YARN_TYPE_STYLES: Record<string, string> = {
  WARP: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  WEFT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  BOTH: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export const YarnTable: React.FC<YarnTableProps> = ({
  yarns,
  startIndex,
  canManage,
  onView,
  onEdit,
  onToggleStatus,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl">
      {/* Desktop / Tablet Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 pl-6 pr-3 w-12 text-center">#</th>
              <th className="py-3.5 px-4">Yarn Name</th>
              <th className="py-3.5 px-4">Denier</th>
              <th className="py-3.5 px-4">Yarn Type</th>
              <th className="py-3.5 px-4">Rate (₹)</th>
              <th className="py-3.5 px-4">Unit</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Updated At</th>
              <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {yarns.map((yarn, idx) => (
              <tr
                key={yarn.id}
                className="group hover:bg-slate-800/40 transition-colors duration-150"
              >
                {/* Index */}
                <td className="py-4 pl-6 pr-3 text-center text-xs font-medium text-slate-500">
                  {startIndex + idx}
                </td>

                {/* Yarn Name */}
                <td className="py-4 px-4 font-semibold text-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[220px]" title={yarn.name}>
                      {yarn.name}
                    </span>
                  </div>
                </td>

                {/* Denier */}
                <td className="py-4 px-4 text-slate-300 font-medium">
                  {yarn.denier} <span className="text-xs text-slate-500">D</span>
                </td>

                {/* Yarn Type */}
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      YARN_TYPE_STYLES[yarn.yarnType] ?? 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {yarn.yarnType}
                  </span>
                </td>

                {/* Rate */}
                <td className="py-4 px-4 font-semibold text-slate-200">
                  ₹{yarn.rate.toFixed(2)}
                </td>

                {/* Unit */}
                <td className="py-4 px-4 text-xs font-medium text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                    {yarn.rateUnit}
                  </span>
                </td>

                {/* Status */}
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      yarn.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        yarn.isActive ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                    {yarn.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Updated At */}
                <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                  {formatDate(yarn.updatedAt)}
                </td>

                {/* Actions */}
                <td className="py-4 pl-4 pr-6 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* View Button */}
                    <button
                      onClick={() => onView(yarn)}
                      title="View Details"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
                    >
                      <Eye size={16} />
                    </button>

                    {/* Edit Button (if authorized) */}
                    {canManage && (
                      <button
                        onClick={() => onEdit(yarn)}
                        title="Edit Yarn"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}

                    {/* Activate / Deactivate Button (if authorized) */}
                    {canManage && (
                      <button
                        onClick={() => onToggleStatus(yarn)}
                        title={yarn.isActive ? 'Deactivate Yarn' : 'Reactivate Yarn'}
                        className={`p-1.5 rounded-lg transition ${
                          yarn.isActive
                            ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                            : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        <Power size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-slate-800">
        {yarns.map((yarn, idx) => (
          <div key={yarn.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-slate-500 font-mono">#{startIndex + idx}</span>
                <h4 className="font-bold text-slate-100 text-base">{yarn.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      YARN_TYPE_STYLES[yarn.yarnType]
                    }`}
                  >
                    {yarn.yarnType}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {yarn.denier} Denier
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  yarn.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {yarn.isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {yarn.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80 text-slate-400">
              <div>
                Rate:{' '}
                <strong className="text-slate-200 text-sm font-semibold">
                  ₹{yarn.rate.toFixed(2)}
                </strong>{' '}
                / {yarn.rateUnit}
              </div>
              <div>{formatDate(yarn.updatedAt)}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => onView(yarn)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <Eye size={13} /> View
              </button>
              {canManage && (
                <button
                  onClick={() => onEdit(yarn)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-amber-300 hover:bg-slate-700"
                >
                  <Edit3 size={13} /> Edit
                </button>
              )}
              {canManage && (
                <button
                  onClick={() => onToggleStatus(yarn)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    yarn.isActive
                      ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                >
                  <Power size={13} />
                  {yarn.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
