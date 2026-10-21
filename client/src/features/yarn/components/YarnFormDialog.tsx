import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Layers, Loader2 } from 'lucide-react';
import type { Yarn, YarnType, RateUnit, CreateYarnInput, UpdateYarnInput } from '../types/yarn.types';

const yarnFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Yarn name is required')
    .max(100, 'Yarn name cannot exceed 100 characters'),
  denier: z
    .number({ invalid_type_error: 'Denier must be a number' })
    .positive('Denier must be greater than zero'),
  yarnType: z.enum(['WARP', 'WEFT', 'BOTH'] as const, {
    errorMap: () => ({ message: 'Please select a yarn type' }),
  }),
  rate: z
    .number({ invalid_type_error: 'Rate must be a number' })
    .min(0, 'Rate must be zero or greater'),
  rateUnit: z.enum(['KG', 'CONE', 'OTHER'] as const, {
    errorMap: () => ({ message: 'Please select a rate unit' }),
  }),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
});

type YarnFormData = z.infer<typeof yarnFormSchema>;

interface YarnFormDialogProps {
  isOpen: boolean;
  yarnToEdit: Yarn | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateYarnInput | UpdateYarnInput) => Promise<void>;
}

export const YarnFormDialog: React.FC<YarnFormDialogProps> = ({
  isOpen,
  yarnToEdit,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(yarnToEdit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<YarnFormData>({
    resolver: zodResolver(yarnFormSchema),
    defaultValues: {
      name: '',
      denier: 150,
      yarnType: 'WEFT',
      rate: 100,
      rateUnit: 'KG',
      description: '',
    },
  });

  useEffect(() => {
    if (yarnToEdit) {
      reset({
        name: yarnToEdit.name,
        denier: yarnToEdit.denier,
        yarnType: yarnToEdit.yarnType,
        rate: yarnToEdit.rate,
        rateUnit: yarnToEdit.rateUnit,
        description: yarnToEdit.description ?? '',
      });
    } else {
      reset({
        name: '',
        denier: 150,
        yarnType: 'WEFT',
        rate: 100,
        rateUnit: 'KG',
        description: '',
      });
    }
  }, [yarnToEdit, reset, isOpen]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: YarnFormData) => {
    await onSubmit({
      name: data.name,
      denier: Number(data.denier),
      yarnType: data.yarnType as YarnType,
      rate: Number(data.rate),
      rateUnit: data.rateUnit as RateUnit,
      description: data.description ? data.description.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: 'var(--color-surface-900, #0f172a)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {isEditing ? 'Edit Yarn' : 'Add Yarn'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Update specifications for this yarn record'
                  : 'Define a new yarn specification for loom weaving'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Yarn Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Yarn Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Rayon Slub, Roto, Cotton 40s"
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 transition ${
                  errors.name
                    ? 'border-rose-500/70 focus:ring-rose-500/30'
                    : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
              />
              {errors.name && (
                <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Denier and Yarn Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Denier <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('denier', { valueAsNumber: true })}
                  placeholder="e.g. 150"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 transition ${
                    errors.denier
                      ? 'border-rose-500/70 focus:ring-rose-500/30'
                      : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                />
                {errors.denier && (
                  <p className="text-xs text-rose-400 mt-1">{errors.denier.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Yarn Type <span className="text-rose-400">*</span>
                </label>
                <select
                  {...register('yarnType')}
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-slate-100 text-sm focus:outline-none focus:ring-2 transition ${
                    errors.yarnType
                      ? 'border-rose-500/70 focus:ring-rose-500/30'
                      : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="WARP">WARP (Warp Beams)</option>
                  <option value="WEFT">WEFT (Weft Insertion)</option>
                  <option value="BOTH">BOTH (Warp or Weft)</option>
                </select>
                {errors.yarnType && (
                  <p className="text-xs text-rose-400 mt-1">{errors.yarnType.message}</p>
                )}
              </div>
            </div>

            {/* Rate and Rate Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Rate (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('rate', { valueAsNumber: true })}
                  placeholder="e.g. 125.00"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 transition ${
                    errors.rate
                      ? 'border-rose-500/70 focus:ring-rose-500/30'
                      : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                />
                {errors.rate && (
                  <p className="text-xs text-rose-400 mt-1">{errors.rate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Rate Unit <span className="text-rose-400">*</span>
                </label>
                <select
                  {...register('rateUnit')}
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border text-slate-100 text-sm focus:outline-none focus:ring-2 transition ${
                    errors.rateUnit
                      ? 'border-rose-500/70 focus:ring-rose-500/30'
                      : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="KG">KG (Kilogram)</option>
                  <option value="CONE">CONE (Per Cone)</option>
                  <option value="OTHER">OTHER</option>
                </select>
                {errors.rateUnit && (
                  <p className="text-xs text-rose-400 mt-1">{errors.rateUnit.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Optional notes regarding supplier, luster, elongation, or filament count..."
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-none"
              />
              {errors.description && (
                <p className="text-xs text-rose-400 mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isEditing ? 'Save Changes' : 'Save Yarn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
