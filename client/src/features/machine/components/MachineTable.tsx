import React from 'react';
import { Link } from 'react-router-dom';
import {
  MoreVertical,
  Eye,
  Edit2,
  Power,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Disc,
} from 'lucide-react';
import type { Machine } from '../types/machine.types';
import { MachineStatus, MACHINE_STATUS_CONFIG } from '../types/machine.types';

interface MachineTableProps {
  machines: Machine[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (machine: Machine) => void;
  onEdit: (machine: Machine) => void;
  onChangeStatus: (machine: Machine) => void;
  onToggleActive: (machine: Machine) => void;
  onLoadBeam: (machine: Machine) => void;
  onUnloadBeam: (machine: Machine) => void;
  canManage: boolean;
  canOperate: boolean;
}

export const MachineTable: React.FC<MachineTableProps> = ({
  machines,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onView,
  onEdit,
  onChangeStatus,
  onToggleActive,
  onLoadBeam,
  onUnloadBeam,
  canManage,
  canOperate,
}) => {
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.machine-actions-menu')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const allSelected = machines.length > 0 && selectedIds.length === machines.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < machines.length;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
          <tr>
            <th className="py-3.5 pl-4 pr-2 w-10 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected;
                }}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/20 focus:ring-offset-0 cursor-pointer"
                title="Select all on this page"
              />
            </th>
            <th className="py-3.5 px-3">Machine No.</th>
            <th className="py-3.5 px-3">Name</th>
            <th className="py-3.5 px-3">Fabric Quality</th>
            <th className="py-3.5 px-3 text-right">RPM</th>
            <th className="py-3.5 px-3 text-right">PPI</th>
            <th className="py-3.5 px-3">Loaded Beam</th>
            <th className="py-3.5 px-3">Status</th>
            <th className="py-3.5 px-3 hidden lg:table-cell">Last Updated</th>
            <th className="py-3.5 px-3 text-center">Active</th>
            <th className="py-3.5 pr-4 pl-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-medium">
          {machines.map((machine) => {
            const statusConfig = MACHINE_STATUS_CONFIG[machine.status] || MACHINE_STATUS_CONFIG[MachineStatus.STOPPED];
            const isSelected = selectedIds.includes(machine.id);

            return (
              <tr
                key={machine.id}
                className={`transition-colors hover:bg-slate-800/40 ${
                  isSelected ? 'bg-teal-500/5' : ''
                } ${!machine.isActive ? 'opacity-60 bg-slate-950/20' : ''}`}
              >
                {/* Selection Checkbox */}
                <td className="py-3.5 pl-4 pr-2 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(machine.id)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/20 focus:ring-offset-0 cursor-pointer"
                  />
                </td>

                {/* Machine Number */}
                <td className="py-3.5 px-3">
                  <Link
                    to={`/machines/${machine.id}`}
                    className="font-mono font-bold text-teal-400 hover:text-teal-300 hover:underline text-sm"
                  >
                    {machine.machineNumber}
                  </Link>
                </td>

                {/* Name */}
                <td className="py-3.5 px-3 text-slate-200">
                  {machine.name}
                </td>

                {/* Fabric Quality */}
                <td className="py-3.5 px-3">
                  {machine.fabric ? (
                    <div>
                      <span className="font-semibold text-slate-100">{machine.fabric.name}</span>
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                        {machine.fabric.code}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Not Assigned</span>
                  )}
                </td>

                {/* RPM */}
                <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-200">
                  {machine.rpm}
                </td>

                {/* PPI */}
                <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-200">
                  {machine.ppi}
                </td>

                {/* Loaded Beam */}
                <td className="py-3.5 px-3">
                  {machine.loadedBeam ? (
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-teal-500/10 text-teal-400">
                        <Disc size={12} />
                      </div>
                      <div>
                        <span className="font-mono font-semibold text-teal-300">
                          {machine.loadedBeam.beamNumber}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {machine.loadedBeam.remainingLengthMeters.toLocaleString()} m rem
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="py-3.5 px-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                    {statusConfig.label}
                  </span>
                </td>

                {/* Last Updated */}
                <td className="py-3.5 px-3 text-slate-400 hidden lg:table-cell text-[11px]">
                  {new Date(machine.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>

                {/* Active */}
                <td className="py-3.5 px-3 text-center">
                  {machine.isActive ? (
                    <span className="inline-flex items-center text-emerald-400" title="Active">
                      <CheckCircle2 size={15} />
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-slate-500" title="Inactive">
                      <XCircle size={15} />
                    </span>
                  )}
                </td>

                {/* Actions Dropdown */}
                <td className="py-3.5 pr-4 pl-2 text-right relative">
                  <div className="inline-block machine-actions-menu">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === machine.id ? null : machine.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                      title="Machine Actions"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openDropdownId === machine.id && (
                      <div className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl py-1 z-50 text-xs">
                        <button
                          onClick={() => {
                            setOpenDropdownId(null);
                            onView(machine);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-800 transition text-left"
                        >
                          <Eye size={13} className="text-teal-400" />
                          View Details
                        </button>

                        {canManage && (
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              onEdit(machine);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-800 transition text-left"
                          >
                            <Edit2 size={13} className="text-blue-400" />
                            Edit Machine
                          </button>
                        )}

                        {canOperate && (
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              onChangeStatus(machine);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-800 transition text-left"
                          >
                            <Power size={13} className="text-amber-400" />
                            Change Status
                          </button>
                        )}

                        {canOperate && !machine.loadedBeamId && machine.status !== MachineStatus.MAINTENANCE && machine.isActive && (
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              onLoadBeam(machine);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-800 transition text-left"
                          >
                            <Disc size={13} className="text-emerald-400" />
                            Load Beam
                          </button>
                        )}

                        {canOperate && machine.loadedBeamId && (
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              onUnloadBeam(machine);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-800 transition text-left"
                          >
                            <Disc size={13} className="text-rose-400" />
                            Unload Beam
                          </button>
                        )}

                        {canManage && (
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              onToggleActive(machine);
                            }}
                            disabled={Boolean(machine.isActive && machine.loadedBeamId)}
                            title={
                              machine.isActive && machine.loadedBeamId
                                ? 'Unload beam before deactivating'
                                : undefined
                            }
                            className={`w-full flex items-center gap-2 px-3 py-2 transition text-left border-t border-slate-800/80 ${
                              machine.isActive
                                ? 'text-rose-400 hover:bg-rose-500/10'
                                : 'text-emerald-400 hover:bg-emerald-500/10'
                            } ${machine.isActive && machine.loadedBeamId ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <RotateCcw size={13} />
                            {machine.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
