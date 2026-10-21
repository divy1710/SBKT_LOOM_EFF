import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Machine, CreateMachineInput, UpdateMachineInput } from '../types/machine.types';
import { MachineStatus } from '../types/machine.types';
import { MachineService, type FabricOption } from '../services/machine.service';

interface MachineFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMachineInput | UpdateMachineInput) => Promise<void>;
  initialData?: Machine | null;
}

export const MachineFormDialog: React.FC<MachineFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEdit = Boolean(initialData);

  // Form Fields
  const [machineNumber, setMachineNumber] = useState('');
  const [name, setName] = useState('');
  const [fabricId, setFabricId] = useState('');
  const [rpm, setRpm] = useState<number | ''>(700);
  const [ppi, setPpi] = useState<number | ''>(68);
  const [status, setStatus] = useState<MachineStatus>(MachineStatus.STOPPED);
  const [notes, setNotes] = useState('');

  // Dropdown options & state
  const [fabrics, setFabrics] = useState<FabricOption[]>([]);
  const [loadingFabrics, setLoadingFabrics] = useState(false);
  const [fabricsError, setFabricsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load Fabrics with Retry capability
  const loadFabrics = useCallback(async () => {
    setLoadingFabrics(true);
    setFabricsError(null);
    try {
      const data = await MachineService.getActiveFabrics();
      setFabrics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load active fabrics.';
      setFabricsError(msg);
      toast.error(msg);
    } finally {
      setLoadingFabrics(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadFabrics();
    }
  }, [isOpen, loadFabrics]);

  // Sync initialData
  useEffect(() => {
    if (initialData) {
      setMachineNumber(initialData.machineNumber);
      setName(initialData.name);
      setFabricId(initialData.fabricId);
      setRpm(initialData.rpm);
      setPpi(initialData.ppi);
      setStatus(initialData.status);
      setNotes(initialData.notes || '');
    } else {
      setMachineNumber('');
      setName('');
      setFabricId('');
      setRpm(700);
      setPpi(68);
      setStatus(MachineStatus.STOPPED);
      setNotes('');
    }
    setFormError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // When fabric changes in create mode, auto-suggest RPM and PPI
  const handleFabricChange = (newFabricId: string) => {
    setFabricId(newFabricId);
    if (!newFabricId) return;

    const selected = fabrics.find((f) => f.id === newFabricId);
    if (selected) {
      if (selected.ppi) setPpi(selected.ppi);
      if (selected.recommendedRpm) setRpm(selected.recommendedRpm);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!machineNumber.trim()) {
      setFormError('Machine number is required.');
      return;
    }
    if (!name.trim()) {
      setFormError('Machine name is required.');
      return;
    }
    if (!fabricId) {
      setFormError('Please select a fabric quality.');
      return;
    }
    if (typeof rpm !== 'number' || rpm <= 0) {
      setFormError('RPM must be a positive number.');
      return;
    }
    if (typeof ppi !== 'number' || ppi <= 0) {
      setFormError('PPI must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await onSubmit({
          machineNumber: machineNumber.trim().toUpperCase(),
          name: name.trim(),
          fabricId,
          rpm,
          ppi,
          notes: notes.trim() || undefined,
        });
      } else {
        await onSubmit({
          machineNumber: machineNumber.trim().toUpperCase(),
          name: name.trim(),
          fabricId,
          rpm,
          ppi,
          status,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-display">
              {isEdit ? `Edit Machine: ${initialData?.machineNumber}` : 'Add New Loom Machine'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure machine specifications, operating speed, and fabric assignment.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Machine Number & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Machine Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={machineNumber}
                onChange={(e) => setMachineNumber(e.target.value.toUpperCase())}
                placeholder="e.g. WJ-01, RP-12"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Machine Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Waterjet Loom 01"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
          </div>

          {/* Fabric Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Assigned Fabric Quality <span className="text-rose-400">*</span>
            </label>

            {loadingFabrics ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2.5 px-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <Loader2 size={14} className="animate-spin text-teal-400" />
                <span>Loading fabrics...</span>
              </div>
            ) : fabricsError ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{fabricsError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void loadFabrics()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px] font-semibold border border-slate-700 transition"
                >
                  Retry
                </button>
              </div>
            ) : fabrics.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                No active fabrics found. Add or activate a fabric in Fabric Master.
              </div>
            ) : (
              <select
                value={fabricId}
                onChange={(e) => handleFabricChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition cursor-pointer"
                required
              >
                <option value="">Select Fabric...</option>
                {/* Preserve current fabric in edit mode if not in active list */}
                {isEdit &&
                  initialData?.fabric &&
                  !fabrics.some((f) => f.id === initialData.fabricId) && (
                    <option value={initialData.fabricId}>
                      {initialData.fabric.name} — {initialData.fabric.code} (Current)
                    </option>
                  )}
                {fabrics.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.code}
                  </option>
                ))}
              </select>
            )}

            {/* Selected Fabric Specifications Display */}
            {(() => {
              const selectedFabric =
                fabrics.find((f) => f.id === fabricId) ||
                (isEdit && initialData?.fabric && initialData.fabricId === fabricId
                  ? initialData.fabric
                  : null);
              if (!selectedFabric) return null;

              return (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-[11px] text-slate-300 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                  <span>
                    Quality: <strong className="text-slate-100">{selectedFabric.name}</strong>
                  </span>
                  <span>
                    Code: <strong className="text-teal-400">{selectedFabric.code}</strong>
                  </span>
                  <span>
                    PPI: <strong className="text-slate-100">{selectedFabric.ppi}</strong>
                  </span>
                  <span>
                    Panno: <strong className="text-slate-100">{selectedFabric.panno}&quot;</strong>
                  </span>
                  {selectedFabric.recommendedRpm && (
                    <span>
                      Rec. RPM: <strong className="text-slate-100">{selectedFabric.recommendedRpm}</strong>
                    </span>
                  )}
                </div>
              );
            })()}

            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Sparkles size={11} className="text-teal-400" />
              Selecting a fabric auto-suggests PPI and recommended RPM settings.
            </p>
          </div>

          {/* RPM & PPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Operating RPM <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={rpm}
                onChange={(e) => setRpm(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 700"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Configured PPI <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={ppi}
                onChange={(e) => setPpi(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 68"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
          </div>

          {/* Status (Only on Create) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Initial Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MachineStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition cursor-pointer"
              >
                <option value={MachineStatus.STOPPED}>Stopped</option>
                <option value={MachineStatus.RUNNING}>Running</option>
                <option value={MachineStatus.MAINTENANCE}>Maintenance</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Shed B, Position 04"
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 transition resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 transition shadow-lg shadow-teal-500/20"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
