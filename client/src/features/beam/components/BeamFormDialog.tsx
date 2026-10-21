import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Disc, Loader2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import type {
  Beam,
  CreateBeamInput,
  UpdateBeamInput,
  FabricOption,
} from '../types/beam.types';
import type { YarnOption } from '@/features/fabric/types/fabric.types';
import { BeamService } from '../services/beam.service';

const beamFormSchema = z
  .object({
    beamNumber: z
      .string()
      .trim()
      .min(1, 'Beam number is required')
      .max(40, 'Beam number cannot exceed 40 characters'),
    pipeNumber: z.string().trim().max(40, 'Pipe number cannot exceed 40 characters').optional(),
    fabricId: z.string().min(1, 'Fabric quality is required'),
    warpYarnId: z.string().min(1, 'Warp yarn is required'),
    originalLengthMeters: z
      .number({
        required_error: 'Original length is required',
        invalid_type_error: 'Original length must be a number',
      })
      .positive('Original length must be greater than zero'),
    remainingLengthMeters: z
      .number({ invalid_type_error: 'Remaining length must be a number' })
      .min(0, 'Remaining length cannot be negative'),
    ends: z
      .number({
        required_error: 'Ends count is required',
        invalid_type_error: 'Ends must be a number',
      })
      .int('Ends count must be a whole number')
      .min(1, 'Ends count must be at least 1'),
    widthInches: z
      .number({ invalid_type_error: 'Beam width must be a number' })
      .positive('Width must be greater than zero')
      .optional()
      .or(z.literal(undefined)),
    alertAtMeters: z
      .number({ invalid_type_error: 'Alert threshold must be a number' })
      .min(0, 'Cannot be negative')
      .default(500),
    notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
  })
  .refine((data) => data.remainingLengthMeters <= data.originalLengthMeters, {
    message: 'Remaining length cannot exceed original length',
    path: ['remainingLengthMeters'],
  });

type BeamFormData = z.infer<typeof beamFormSchema>;

interface BeamFormDialogProps {
  isOpen: boolean;
  beamToEdit: Beam | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBeamInput | UpdateBeamInput) => Promise<void>;
}

const fieldClass = (hasError?: boolean) =>
  `w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 transition ${
    hasError
      ? 'border-rose-500/70 focus:ring-rose-500/30'
      : 'border-slate-700 focus:border-teal-500 focus:ring-teal-500/20'
  }`;

export const BeamFormDialog: React.FC<BeamFormDialogProps> = ({
  isOpen,
  beamToEdit,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(beamToEdit);

  // Dropdown states
  const [fabrics, setFabrics] = useState<FabricOption[]>([]);
  const [fabricsLoading, setFabricsLoading] = useState(false);
  const [fabricsError, setFabricsError] = useState<string | null>(null);

  const [yarns, setYarns] = useState<YarnOption[]>([]);
  const [yarnsLoading, setYarnsLoading] = useState(false);
  const [yarnsError, setYarnsError] = useState<string | null>(null);

  const [autoInheritedYarn, setAutoInheritedYarn] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BeamFormData>({
    resolver: zodResolver(beamFormSchema),
    defaultValues: {
      beamNumber: '',
      pipeNumber: '',
      fabricId: '',
      warpYarnId: '',
      originalLengthMeters: 9000,
      remainingLengthMeters: 9000,
      ends: 5000,
      widthInches: undefined,
      alertAtMeters: 500,
      notes: '',
    },
  });

  const selectedFabricId = watch('fabricId');
  const watchedOriginalLength = watch('originalLengthMeters');

  // Load Fabrics and Yarns
  const loadDropdownData = useCallback(() => {
    setFabricsLoading(true);
    setFabricsError(null);
    BeamService.getActiveFabrics()
      .then((data) => setFabrics(data))
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Failed to load fabrics:', err);
        setFabricsError('Failed to load fabric qualities. Please retry.');
      })
      .finally(() => setFabricsLoading(false));

    setYarnsLoading(true);
    setYarnsError(null);
    BeamService.getActiveWarpYarns()
      .then((data) => setYarns(data))
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Failed to load warp yarns:', err);
        setYarnsError('Failed to load warp yarns. Please retry.');
      })
      .finally(() => setYarnsLoading(false));
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen, loadDropdownData]);

  // When creating a new beam, auto-default remainingLengthMeters when originalLength changes
  const handleOriginalLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setValue('originalLengthMeters', val);
    if (!isEditing) {
      setValue('remainingLengthMeters', val);
    }
  };

  // Auto-inherit warp yarn from selected fabric
  useEffect(() => {
    if (!selectedFabricId) return;
    const match = fabrics.find((f) => f.id === selectedFabricId);
    if (match && match.warpYarnId && !isEditing) {
      setValue('warpYarnId', match.warpYarnId);
      setAutoInheritedYarn(true);
    }
  }, [selectedFabricId, fabrics, isEditing, setValue]);

  // Populate form when editing or resetting
  useEffect(() => {
    if (beamToEdit) {
      reset({
        beamNumber: beamToEdit.beamNumber,
        pipeNumber: beamToEdit.pipeNumber || '',
        fabricId: beamToEdit.fabricId,
        warpYarnId: beamToEdit.warpYarnId,
        originalLengthMeters: beamToEdit.originalLengthMeters,
        remainingLengthMeters: beamToEdit.remainingLengthMeters,
        ends: beamToEdit.ends,
        widthInches: beamToEdit.widthInches ?? undefined,
        alertAtMeters: beamToEdit.alertAtMeters ?? 500,
        notes: beamToEdit.notes || '',
      });
      setAutoInheritedYarn(false);
    } else {
      reset({
        beamNumber: '',
        pipeNumber: '',
        fabricId: '',
        warpYarnId: '',
        originalLengthMeters: 9000,
        remainingLengthMeters: 9000,
        ends: 5000,
        widthInches: undefined,
        alertAtMeters: 500,
        notes: '',
      });
      setAutoInheritedYarn(false);
    }
  }, [beamToEdit, reset, isOpen]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: BeamFormData) => {
    await onSubmit({
      beamNumber: data.beamNumber.toUpperCase(),
      pipeNumber: data.pipeNumber?.trim() || undefined,
      fabricId: data.fabricId,
      warpYarnId: data.warpYarnId,
      originalLengthMeters: Number(data.originalLengthMeters),
      remainingLengthMeters: Number(data.remainingLengthMeters),
      ends: Number(data.ends),
      widthInches: data.widthInches ? Number(data.widthInches) : undefined,
      alertAtMeters: Number(data.alertAtMeters),
      notes: data.notes?.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        style={{ background: 'var(--color-surface-900, #0f172a)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Disc size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {isEditing ? 'Edit Beam' : 'Add Beam'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? `Editing specifications for ${beamToEdit?.beamNumber || ''}`
                  : 'Register a newly warped beam into Godown inventory'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-4">
            {/* Beam Number & Pipe Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Beam Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('beamNumber')}
                  placeholder="e.g. B001"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.beamNumber))}
                />
                {errors.beamNumber && (
                  <p className="text-xs text-rose-400 mt-1">{errors.beamNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Pipe Number <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  {...register('pipeNumber')}
                  placeholder="e.g. P-12"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.pipeNumber))}
                />
                {errors.pipeNumber && (
                  <p className="text-xs text-rose-400 mt-1">{errors.pipeNumber.message}</p>
                )}
              </div>
            </div>

            {/* Fabric Quality Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Fabric Quality <span className="text-rose-400">*</span>
              </label>
              {fabricsLoading ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
                  <Loader2 size={13} className="animate-spin text-teal-400" />
                  <span>Loading fabric qualities…</span>
                </div>
              ) : fabricsError ? (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{fabricsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadDropdownData}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs cursor-pointer"
                  >
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : fabrics.length === 0 ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                  <AlertCircle size={14} className="shrink-0 text-amber-400" />
                  <span>No active fabric qualities found. Please create one in Fabric Master.</span>
                </div>
              ) : (
                <Controller
                  name="fabricId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      disabled={isSubmitting}
                      className={fieldClass(Boolean(errors.fabricId))}
                    >
                      <option value="">— Select Fabric Quality —</option>
                      {fabrics.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.code} — {f.name} (PPI: {f.ppi}, Panno: {f.panno})
                        </option>
                      ))}
                    </select>
                  )}
                />
              )}
              {errors.fabricId && (
                <p className="text-xs text-rose-400 mt-1">{errors.fabricId.message}</p>
              )}
            </div>

            {/* Warp Yarn Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Warp Yarn <span className="text-rose-400">*</span>
                </label>
                {autoInheritedYarn && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-teal-400">
                    <Sparkles size={11} /> Auto-suggested from fabric
                  </span>
                )}
              </div>
              {yarnsLoading ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
                  <Loader2 size={13} className="animate-spin text-teal-400" />
                  <span>Loading warp yarns…</span>
                </div>
              ) : yarnsError ? (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{yarnsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadDropdownData}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs cursor-pointer"
                  >
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : yarns.length === 0 ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                  <AlertCircle size={14} className="shrink-0 text-amber-400" />
                  <span>No active warp yarns found. Add a compatible yarn in Yarn Master.</span>
                </div>
              ) : (
                <Controller
                  name="warpYarnId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      disabled={isSubmitting}
                      className={fieldClass(Boolean(errors.warpYarnId))}
                    >
                      <option value="">— Select Warp Yarn —</option>
                      {yarns.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} — {y.denier} Denier — {y.yarnType}
                        </option>
                      ))}
                    </select>
                  )}
                />
              )}
              {errors.warpYarnId && (
                <p className="text-xs text-rose-400 mt-1">{errors.warpYarnId.message}</p>
              )}
            </div>

            {/* Length Specifications (Original & Remaining) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Original Length (Meters) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  value={watchedOriginalLength ?? ''}
                  onChange={handleOriginalLengthChange}
                  placeholder="e.g. 9300"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.originalLengthMeters))}
                />
                {errors.originalLengthMeters && (
                  <p className="text-xs text-rose-400 mt-1">{errors.originalLengthMeters.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Remaining Length (Meters) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  {...register('remainingLengthMeters', { valueAsNumber: true })}
                  placeholder="e.g. 9300"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.remainingLengthMeters))}
                />
                {errors.remainingLengthMeters && (
                  <p className="text-xs text-rose-400 mt-1">
                    {errors.remainingLengthMeters.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row: Ends + Width + Alert Threshold */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Number of Ends <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  {...register('ends', { valueAsNumber: true })}
                  placeholder="e.g. 5680"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.ends))}
                />
                {errors.ends && <p className="text-xs text-rose-400 mt-1">{errors.ends.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Beam Width (in){' '}
                  <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('widthInches', {
                    setValueAs: (v) => (v === '' || v === undefined ? undefined : Number(v)),
                  })}
                  placeholder="e.g. 63"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.widthInches))}
                />
                {errors.widthInches && (
                  <p className="text-xs text-rose-400 mt-1">{errors.widthInches.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Low-Meter Alert Threshold (m)
                </label>
                <input
                  type="number"
                  step="1"
                  {...register('alertAtMeters', { valueAsNumber: true })}
                  placeholder="500"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.alertAtMeters))}
                />
                {errors.alertAtMeters && (
                  <p className="text-xs text-rose-400 mt-1">{errors.alertAtMeters.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Notes / Warping Remarks <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Add warping machine notes, set details, or lot number…"
                disabled={isSubmitting}
                className={`${fieldClass(Boolean(errors.notes))} resize-none`}
              />
              {errors.notes && <p className="text-xs text-rose-400 mt-1">{errors.notes.message}</p>}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || fabricsLoading || yarnsLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isEditing ? 'Save Changes' : 'Register Beam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
