import React from 'react';
import { Eye, Pencil, ToggleLeft, ToggleRight, CheckCircle2, XCircle } from 'lucide-react';
import type { Fabric } from '../types/fabric.types';

interface FabricTableProps {
  fabrics: Fabric[];
  startIndex: number;
  canManage: boolean;
  onView: (fabric: Fabric) => void;
  onEdit: (fabric: Fabric) => void;
  onToggleStatus: (fabric: Fabric) => void;
}

export const FabricTable: React.FC<FabricTableProps> = ({
  fabrics,
  startIndex,
  canManage,
  onView,
  onEdit,
  onToggleStatus,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-xs">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Fabric Name
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Code
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                PPI
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Panno
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Wastage %
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {fabrics.map((fabric, idx) => (
              <tr
                key={fabric.id}
                className="group border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors duration-150 cursor-pointer"
                onClick={() => onView(fabric)}
              >
                <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                  {startIndex + idx}
                </td>

                <td className="px-4 py-3.5">
                  <div className="font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                    {fabric.name}
                  </div>
                  {fabric.description && (
                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">
                      {fabric.description}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs px-2 py-1 rounded-lg bg-slate-800 text-teal-300 border border-slate-700/60">
                    {fabric.code}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">{fabric.ppi}</td>

                <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">{fabric.panno}</td>

                <td className="px-4 py-3.5">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      fabric.wastagePercent > 5
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {fabric.wastagePercent}%
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  {fabric.isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={11} />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 rounded-full">
                      <XCircle size={11} />
                      Inactive
                    </span>
                  )}
                </td>

                <td
                  className="px-4 py-3.5"
                  onClick={(e) => e.stopPropagation()} // Prevent row click
                >
                  <div className="flex items-center justify-center gap-1">
                    {/* View Details */}
                    <button
                      type="button"
                      title="View Details"
                      onClick={() => onView(fabric)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 transition cursor-pointer"
                    >
                      <Eye size={15} />
                    </button>

                    {/* Edit (Admin only) */}
                    {canManage && (
                      <button
                        type="button"
                        title="Edit Fabric"
                        onClick={() => onEdit(fabric)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 transition cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                    )}

                    {/* Toggle Status (Admin only) */}
                    {canManage && (
                      <button
                        type="button"
                        title={fabric.isActive ? 'Deactivate Fabric' : 'Activate Fabric'}
                        onClick={() => onToggleStatus(fabric)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          fabric.isActive
                            ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                            : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        {fabric.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
