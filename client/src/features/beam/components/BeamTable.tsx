import React from 'react';
import {
  Eye,
  Pencil,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import type { Beam } from '../types/beam.types';
import { BeamStatus, BEAM_STATUS_COLORS, BEAM_STATUS_LABELS } from '../types/beam.types';

interface BeamTableProps {
  beams: Beam[];
  startIndex: number;
  canManage: boolean;
  canOperate: boolean;
  onView: (beam: Beam) => void;
  onEdit: (beam: Beam) => void;
  onToggleStatus: (beam: Beam) => void;
  onLoad: (beam: Beam) => void;
  onUnload: (beam: Beam) => void;
}

export const BeamTable: React.FC<BeamTableProps> = ({
  beams,
  startIndex,
  canManage,
  canOperate,
  onView,
  onEdit,
  onToggleStatus,
  onLoad,
  onUnload,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-xs">
              <th className="px-3.5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-10">
                #
              </th>
              <th className="px-3.5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Beam No
              </th>
              <th className="px-3.5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Pipe No
              </th>
              <th className="px-3.5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Fabric Quality
              </th>
              <th className="px-3.5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Warp Yarn
              </th>
              <th className="px-3.5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Orig. Length
              </th>
              <th className="px-3.5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Remaining
              </th>
              <th className="px-3.5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Ends
              </th>
              <th className="px-3.5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Status
              </th>
              <th className="px-3.5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Machine
              </th>
              <th className="px-3.5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {beams.map((beam, idx) => {
              const statusCfg = BEAM_STATUS_COLORS[beam.status] || BEAM_STATUS_COLORS[BeamStatus.IN_GODOWN];
              const isLoaded = beam.status === BeamStatus.LOADED;

              return (
                <tr
                  key={beam.id}
                  className="group border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors duration-150 cursor-pointer"
                  onClick={() => onView(beam)}
                >
                  <td className="px-3.5 py-3 text-xs text-slate-600 font-mono">
                    {startIndex + idx}
                  </td>

                  {/* Beam Number */}
                  <td className="px-3.5 py-3">
                    <span className="font-mono text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800 text-teal-300 border border-slate-700/60">
                      {beam.beamNumber}
                    </span>
                  </td>

                  {/* Pipe Number */}
                  <td className="px-3.5 py-3 text-slate-400 font-mono text-xs">
                    {beam.pipeNumber || '—'}
                  </td>

                  {/* Fabric Quality */}
                  <td className="px-3.5 py-3">
                    <div className="font-medium text-slate-100 group-hover:text-teal-300 transition-colors text-xs truncate max-w-[150px]">
                      {beam.fabric?.name || '—'}
                    </div>
                    {beam.fabric?.code && (
                      <div className="text-[11px] font-mono text-slate-500">
                        {beam.fabric.code}
                      </div>
                    )}
                  </td>

                  {/* Warp Yarn */}
                  <td className="px-3.5 py-3 text-xs text-slate-300">
                    <div>{beam.warpYarn?.name || '—'}</div>
                    {beam.warpYarn?.denier && (
                      <div className="text-[11px] text-slate-500">
                        {beam.warpYarn.denier}D ({beam.warpYarn.yarnType})
                      </div>
                    )}
                  </td>

                  {/* Original Length */}
                  <td className="px-3.5 py-3 text-right font-mono text-xs text-slate-300">
                    {beam.originalLengthMeters.toLocaleString()} m
                  </td>

                  {/* Remaining Length + Low Meter Alert */}
                  <td className="px-3.5 py-3 text-right font-mono text-xs">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {beam.isLowMeters && (
                        <span
                          title={`Low Meters Alert! Remaining: ${beam.remainingLengthMeters}m (Threshold: ${beam.alertAtMeters}m)`}
                          className="inline-flex items-center text-amber-400"
                        >
                          <AlertTriangle size={12} className="animate-pulse" />
                        </span>
                      )}
                      <span
                        className={`font-semibold ${
                          beam.remainingLengthMeters === 0
                            ? 'text-slate-500'
                            : beam.isLowMeters
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                        }`}
                      >
                        {beam.remainingLengthMeters.toLocaleString()} m
                      </span>
                    </div>
                  </td>

                  {/* Ends */}
                  <td className="px-3.5 py-3 text-right font-mono text-xs text-slate-300">
                    {beam.ends}
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.badge}`}
                    >
                      {BEAM_STATUS_LABELS[beam.status]}
                    </span>
                  </td>

                  {/* Loaded Machine */}
                  <td className="px-3.5 py-3 text-xs font-mono">
                    {beam.loadedMachineNumber ? (
                      <span className="text-teal-300 font-semibold">
                        {beam.loadedMachineNumber}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td
                    className="px-3.5 py-3"
                    onClick={(e) => e.stopPropagation()} // Prevent row click
                  >
                    <div className="flex items-center justify-center gap-1">
                      {/* View */}
                      <button
                        type="button"
                        title="View Details"
                        onClick={() => onView(beam)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 transition cursor-pointer"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Edit (Admin/Manager only) */}
                      {canManage && (
                        <button
                          type="button"
                          title="Edit Beam"
                          onClick={() => onEdit(beam)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 transition cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                      )}

                      {/* Load / Unload (Floor operation) */}
                      {canOperate && (
                        <>
                          {!isLoaded && beam.status === BeamStatus.IN_GODOWN && (
                            <button
                              type="button"
                              title="Load onto Loom"
                              onClick={() => onLoad(beam)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer"
                            >
                              <ArrowUpRight size={14} />
                            </button>
                          )}
                          {isLoaded && (
                            <button
                              type="button"
                              title="Unload from Loom"
                              onClick={() => onUnload(beam)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition cursor-pointer"
                            >
                              <ArrowDownLeft size={14} />
                            </button>
                          )}
                        </>
                      )}

                      {/* Soft Toggle (Admin only) */}
                      {canManage && (
                        <button
                          type="button"
                          title={beam.isActive ? 'Deactivate Beam' : 'Activate Beam'}
                          onClick={() => onToggleStatus(beam)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            beam.isActive
                              ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                              : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {beam.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
