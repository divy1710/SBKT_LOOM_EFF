import React, { useEffect, useState } from 'react';
import {
  X,
  Disc,
  AlertTriangle,
  History,
  Layers,
  Ruler,
  Clock,
  Loader2,
} from 'lucide-react';
import type { Beam, BeamHistory } from '../types/beam.types';
import {
  BEAM_STATUS_COLORS,
  BEAM_STATUS_LABELS,
} from '../types/beam.types';
import { BeamService } from '../services/beam.service';

interface BeamDetailDialogProps {
  beam: Beam | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (beam: Beam) => void;
  canManage?: boolean;
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 px-3 border-b border-slate-800/60 last:border-0 text-xs">
    <span className="text-slate-400 font-medium">{label}</span>
    <span className="text-slate-100 font-medium">{value ?? '—'}</span>
  </div>
);

export const BeamDetailDialog: React.FC<BeamDetailDialogProps> = ({
  beam,
  isOpen,
  onClose,
  onEdit,
  canManage,
}) => {
  const [history, setHistory] = useState<BeamHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (isOpen && beam) {
      setHistoryLoading(true);
      BeamService.getBeamHistory(beam.id)
        .then((res) => setHistory(res))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [isOpen, beam]);

  if (!isOpen || !beam) return null;

  const statusCfg = BEAM_STATUS_COLORS[beam.status];
  const usedLength = Math.max(0, beam.originalLengthMeters - beam.remainingLengthMeters);
  const percentUsed =
    beam.originalLengthMeters > 0
      ? Math.min(100, Math.round((usedLength / beam.originalLengthMeters) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: 'var(--color-surface-900, #0f172a)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Disc size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 font-mono">{beam.beamNumber}</h3>
                {beam.pipeNumber && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    Pipe: {beam.pipeNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {beam.fabric?.name || 'Beam Details'}
              </p>
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
          {/* Status & Low-Meter Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.badge}`}>
                {BEAM_STATUS_LABELS[beam.status]}
              </span>
              {beam.loadedMachineNumber && (
                <span className="text-xs text-teal-300 font-mono">
                  Loaded on: <strong className="font-bold">{beam.loadedMachineNumber}</strong>
                </span>
              )}
            </div>

            {beam.isLowMeters && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
                <AlertTriangle size={13} className="text-amber-400" />
                Low Meters (Remaining &le; {beam.alertAtMeters}m)
              </span>
            )}
          </div>

          {/* Meter Progress Bar */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">Production Progress</span>
              <span className="font-mono text-slate-200 font-semibold">{percentUsed}% Consumed</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  beam.isLowMeters ? 'bg-amber-400' : 'bg-teal-500'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Original</div>
                <div className="font-mono text-xs text-slate-200 font-semibold mt-0.5">
                  {beam.originalLengthMeters.toLocaleString()} m
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Used</div>
                <div className="font-mono text-xs text-slate-300 font-semibold mt-0.5">
                  {usedLength.toLocaleString()} m
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining</div>
                <div
                  className={`font-mono text-xs font-semibold mt-0.5 ${
                    beam.isLowMeters ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {beam.remainingLengthMeters.toLocaleString()} m
                </div>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fabric & Yarn */}
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                <Layers size={11} /> Quality References
              </p>
              <div className="rounded-xl overflow-hidden border border-slate-800/60">
                <DetailRow
                  label="Fabric"
                  value={
                    beam.fabric ? (
                      <span className="font-medium text-slate-200">
                        {beam.fabric.code} ({beam.fabric.name})
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                {beam.fabric?.panno !== undefined && (
                  <DetailRow label="Panno" value={beam.fabric.panno} />
                )}
                {beam.fabric?.ppi !== undefined && (
                  <DetailRow label="PPI" value={beam.fabric.ppi} />
                )}
                <DetailRow
                  label="Warp Yarn"
                  value={
                    beam.warpYarn ? (
                      <span className="font-medium text-slate-200">
                        {beam.warpYarn.name} ({beam.warpYarn.denier}D)
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
              </div>
            </div>

            {/* Beam Mechanical Specs */}
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                <Ruler size={11} /> Physical Specs
              </p>
              <div className="rounded-xl overflow-hidden border border-slate-800/60">
                <DetailRow label="Number of Ends" value={beam.ends} />
                <DetailRow
                  label="Beam Width"
                  value={beam.widthInches ? `${beam.widthInches}"` : '—'}
                />
                <DetailRow label="Alert Threshold" value={`${beam.alertAtMeters} m`} />
                <DetailRow
                  label="Machine Loaded"
                  value={beam.loadedMachineNumber || '—'}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          {beam.notes && (
            <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <strong className="text-slate-400 block mb-1">Notes:</strong>
              {beam.notes}
            </div>
          )}

          {/* Loading History Section */}
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2 flex items-center gap-1.5">
              <History size={11} /> Loading & Unloading History
            </p>
            {historyLoading ? (
              <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                <Loader2 size={13} className="animate-spin" /> Loading history…
              </div>
            ) : history.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 rounded-xl bg-slate-800/20 border border-slate-800 text-center">
                No loading history recorded yet. Beam is in Godown storage.
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-slate-800/60 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/40 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="p-2">Event Date</th>
                      <th className="p-2">Machine</th>
                      <th className="p-2">Meters</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/20">
                        <td className="p-2 text-slate-300">
                          {new Date(h.loadedAt).toLocaleDateString()}
                        </td>
                        <td className="p-2 font-mono text-teal-300">
                          {h.machineNumber || '—'}
                        </td>
                        <td className="p-2 font-mono text-slate-300">
                          {h.startingMeters} m
                          {h.endingMeters !== undefined && ` → ${h.endingMeters} m`}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              BEAM_STATUS_COLORS[h.status]?.badge || ''
                            }`}
                          >
                            {BEAM_STATUS_LABELS[h.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Information */}
          <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800/60">
            <span className="flex items-center gap-1">
              <Clock size={11} /> Created: {new Date(beam.createdAt).toLocaleString()}
            </span>
            <span>Updated: {new Date(beam.updatedAt).toLocaleString()}</span>
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
                onEdit(beam);
              }}
              className="px-4 py-2 text-sm rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium transition cursor-pointer"
            >
              Edit Beam
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
