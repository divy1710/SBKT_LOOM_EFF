import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Layers, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { Fabric, CreateFabricInput, UpdateFabricInput, YarnOption } from '../types/fabric.types';
import { FabricService } from '../services/fabric.service';

// ─── Zod Form Schema ──────────────────────────────────────────────────────────
const fabricFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Fabric name is required')
    .max(120, 'Fabric name cannot exceed 120 characters'),
  code: z
    .string()
    .trim()
    .min(1, 'Fabric code is required')
    .max(40, 'Fabric code cannot exceed 40 characters'),
  warpYarnId: z.string().min(1, 'Warp yarn is required'),
  weftYarnId: z.string().min(1, 'Weft yarn is required'),
  ppi: z
    .number({ invalid_type_error: 'PPI must be a number' })
    .int('PPI must be a whole number')
    .min(1, 'PPI must be at least 1'),
  panno: z
    .number({ invalid_type_error: 'Panno must be a number' })
    .min(0, 'Panno must be zero or greater'),
  wastagePercent: z
    .number({ invalid_type_error: 'Wastage percent must be a number' })
    .min(0, 'Cannot be negative')
    .max(100, 'Cannot exceed 100'),
  recommendedRpm: z
    .number({ invalid_type_error: 'RPM must be a number' })
    .int('RPM must be a whole number')
    .min(1, 'RPM must be at least 1')
    .optional()
    .or(z.literal(undefined)),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
});

type FabricFormData = z.infer<typeof fabricFormSchema>;

interface FabricFormDialogProps {
  isOpen: boolean;
  fabricToEdit: Fabric | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFabricInput | UpdateFabricInput) => Promise<void>;
}

// ─── Input field styling helper ────────────────────────────────────────────────
const fieldClass = (hasError?: boolean) =>
  `w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 transition ${
    hasError
      ? 'border-rose-500/70 focus:ring-rose-500/30'
      : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
  }`;

export const FabricFormDialog: React.FC<FabricFormDialogProps> = ({
  isOpen,
  fabricToEdit,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(fabricToEdit);

  const [yarns, setYarns] = useState<YarnOption[]>([]);
  const [yarnsLoading, setYarnsLoading] = useState(false);
  const [yarnsError, setYarnsError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FabricFormData>({
    resolver: zodResolver(fabricFormSchema),
    defaultValues: {
      name: '',
      code: '',
      warpYarnId: '',
      weftYarnId: '',
      ppi: 60,
      panno: 44.5,
      wastagePercent: 2.0,
      recommendedRpm: undefined,
      description: '',
    },
  });

  // ── Load yarn options with diagnostic error handling and retry support ─────
  const loadYarns = useCallback(() => {
    setYarnsLoading(true);
    setYarnsError(null);

    FabricService.getActiveYarns()
      .then((data) => {
        setYarns(data);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Unknown error occurred';

        if (import.meta.env.DEV) {
          console.error('[FabricForm] Failed to load yarn options:', message);
        }
        setYarnsError('Failed to load yarn options. Please try again.');
      })
      .finally(() => {
        setYarnsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadYarns();
    }
  }, [isOpen, loadYarns]);

  // ── Populate form when editing or opening ──────────────────────────────────
  useEffect(() => {
    if (fabricToEdit) {
      reset({
        name: fabricToEdit.name,
        code: fabricToEdit.code,
        warpYarnId: fabricToEdit.warpYarnId,
        weftYarnId: fabricToEdit.weftYarnId,
        ppi: fabricToEdit.ppi,
        panno: fabricToEdit.panno,
        wastagePercent: fabricToEdit.wastagePercent,
        recommendedRpm: fabricToEdit.recommendedRpm ?? undefined,
        description: fabricToEdit.description ?? '',
      });
    } else {
      reset({
        name: '',
        code: '',
        warpYarnId: '',
        weftYarnId: '',
        ppi: 60,
        panno: 44.5,
        wastagePercent: 2.0,
        recommendedRpm: undefined,
        description: '',
      });
    }
  }, [fabricToEdit, reset, isOpen]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: FabricFormData) => {
    await onSubmit({
      name: data.name,
      code: data.code.toUpperCase(),
      warpYarnId: data.warpYarnId,
      weftYarnId: data.weftYarnId,
      ppi: Number(data.ppi),
      panno: Number(data.panno),
      wastagePercent: Number(data.wastagePercent),
      recommendedRpm: data.recommendedRpm ? Number(data.recommendedRpm) : undefined,
      description: data.description?.trim() || undefined,
    });
  };

  // ── Filter yarn options according to requirements ─────────────────────────
  // Warp: Active yarns with type WARP or BOTH
  const warpOptions = yarns.filter(
    (y) => (y.isActive === undefined || y.isActive === true) && (y.yarnType === 'WARP' || y.yarnType === 'BOTH'),
  );

  // Weft: Active yarns with type WEFT or BOTH
  const weftOptions = yarns.filter(
    (y) => (y.isActive === undefined || y.isActive === true) && (y.yarnType === 'WEFT' || y.yarnType === 'BOTH'),
  );

  const renderYarnSelect = (
    label: string,
    name: 'warpYarnId' | 'weftYarnId',
    yarnRole: 'WARP' | 'WEFT',
    options: YarnOption[],
  ) => {
    const emptyNotice =
      yarnRole === 'WARP'
        ? 'No active warp yarns found. Add a compatible yarn in Yarn Master.'
        : 'No active weft yarns found. Add a compatible yarn in Yarn Master.';

    return (
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          {label} <span className="text-rose-400">*</span>
        </label>

        {yarnsLoading ? (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
            <Loader2 size={13} className="animate-spin text-blue-400" />
            <span>Loading yarn options…</span>
          </div>
        ) : yarnsError ? (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{yarnsError}</span>
            </div>
            <button
              type="button"
              onClick={loadYarns}
              disabled={yarnsLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium transition cursor-pointer"
            >
              <RefreshCw size={12} className={yarnsLoading ? 'animate-spin' : ''} />
              Retry
            </button>
          </div>
        ) : options.length === 0 ? (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
            <AlertCircle size={14} className="shrink-0 text-amber-400" />
            <span>{emptyNotice}</span>
          </div>
        ) : (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <select
                {...field}
                disabled={isSubmitting || yarnsLoading}
                className={fieldClass(Boolean(errors[name]))}
              >
                <option value="">— Select {label} —</option>
                {options.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} — {y.denier} Denier — {y.yarnType}
                  </option>
                ))}
              </select>
            )}
          />
        )}

        {errors[name] && (
          <p className="text-xs text-rose-400 mt-1">{errors[name]?.message}</p>
        )}
      </div>
    );
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
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {isEditing ? 'Edit Fabric' : 'Add Fabric'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? `Editing specifications for ${fabricToEdit?.code || ''}`
                  : 'Define a new loom fabric specification'}
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
            {/* Fabric Name & Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fabric Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder='e.g. Plain Rayon 63"'
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.name))}
                />
                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fabric Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('code')}
                  placeholder="e.g. SBK-RAYON-63"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.code))}
                />
                {errors.code && <p className="text-xs text-rose-400 mt-1">{errors.code.message}</p>}
              </div>
            </div>

            {/* Warp Yarn */}
            {renderYarnSelect('Warp Yarn', 'warpYarnId', 'WARP', warpOptions)}

            {/* Weft Yarn */}
            {renderYarnSelect('Weft Yarn', 'weftYarnId', 'WEFT', weftOptions)}

            {/* Row: PPI + Panno + Wastage % */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  PPI <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  {...register('ppi', { valueAsNumber: true })}
                  placeholder="60"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.ppi))}
                />
                {errors.ppi && <p className="text-xs text-rose-400 mt-1">{errors.ppi.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Panno <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('panno', { valueAsNumber: true })}
                  placeholder="44.5"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.panno))}
                />
                {errors.panno && <p className="text-xs text-rose-400 mt-1">{errors.panno.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Wastage % <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('wastagePercent', { valueAsNumber: true })}
                  placeholder="2.0"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.wastagePercent))}
                />
                {errors.wastagePercent && (
                  <p className="text-xs text-rose-400 mt-1">{errors.wastagePercent.message}</p>
                )}
              </div>
            </div>

            {/* Recommended RPM */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Recommended RPM{' '}
                <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register('recommendedRpm', {
                  setValueAs: (v: string) => (v === '' || v === undefined ? undefined : Number(v)),
                })}
                placeholder="e.g. 550"
                disabled={isSubmitting}
                className={fieldClass(Boolean(errors.recommendedRpm))}
              />
              {errors.recommendedRpm && (
                <p className="text-xs text-rose-400 mt-1">{errors.recommendedRpm.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description{' '}
                <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Add fabric notes, construction details, or client specifications…"
                disabled={isSubmitting}
                className={`${fieldClass(Boolean(errors.description))} resize-none`}
              />
              {errors.description && (
                <p className="text-xs text-rose-400 mt-1">{errors.description.message}</p>
              )}
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
              disabled={isSubmitting || yarnsLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Fabric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
