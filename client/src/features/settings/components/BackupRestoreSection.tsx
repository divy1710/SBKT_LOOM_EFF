import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ShieldAlert,
  Database,
  Layers,
  FileCheck,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  backupClientService,
  type ValidateBackupResult,
  type RestoreSummary,
} from '../services/backup.service';

export const BackupRestoreSection: React.FC = () => {
  // ─── Export State ───────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState(false);
  const [lastExportedFile, setLastExportedFile] = useState<string | null>(null);

  // ─── Import & Validation State ──────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateBackupResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Restore State ──────────────────────────────────────────────────────────
  const [restoreMode, setRestoreMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');
  const [restoring, setRestoring] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(null);

  // ─── 1. Export Full Backup ──────────────────────────────────────────────────
  const handleExportBackup = async () => {
    setExportLoading(true);
    try {
      const filename = await backupClientService.downloadFullBackup();
      setLastExportedFile(filename);
      toast.success(`Full company backup downloaded: ${filename}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to generate company backup.';
      toast.error(msg);
    } finally {
      setExportLoading(false);
    }
  };

  // ─── 2. Handle File Selection & Validation ──────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Only .zip backup archives are supported.');
      return;
    }

    setSelectedFile(file);
    setValidationResult(null);
    setRestoreSummary(null);
    setValidating(true);

    try {
      const result = await backupClientService.validateBackup(file);
      setValidationResult(result);
      if (result.valid) {
        toast.success('Backup archive validated successfully.');
      } else {
        toast.error('Backup archive validation failed. See details below.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Archive validation failed.';
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  };

  // ─── 3. Trigger Restore ─────────────────────────────────────────────────────
  const handleExecuteRestore = async () => {
    if (!selectedFile) return;

    if (restoreMode === 'REPLACE') {
      if (confirmationPhrase !== 'RESTORE COMPANY DATA') {
        toast.error('Please type the exact confirmation phrase to proceed.');
        return;
      }
    }

    setRestoring(true);
    setShowConfirmModal(false);

    try {
      let summary: RestoreSummary;
      if (restoreMode === 'REPLACE') {
        summary = await backupClientService.restoreFullReplace(selectedFile, confirmationPhrase);
        toast.success('Company dataset replaced successfully from backup.');
      } else {
        summary = await backupClientService.restoreMerge(selectedFile);
        toast.success('Company dataset merged successfully.');
      }
      setRestoreSummary(summary);
      setConfirmationPhrase('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Restoration failed.';
      toast.error(msg);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: CREATE FULL BACKUP                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 sm:p-8 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="text-blue-400" size={22} />
              <h3 className="text-lg font-bold text-slate-100">Company Backup & Export</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Generate a standalone, encrypted-ready ZIP archive containing all 8 company collections.
            </p>
          </div>

          <button
            id="btn-create-backup"
            type="button"
            onClick={handleExportBackup}
            disabled={exportLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {exportLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating Backup...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Create Full Backup</span>
              </>
            )}
          </button>
        </div>

        {/* Informational badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold mb-1">
              <Database size={14} className="text-blue-400" />
              <span>Full Data Preservation</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Preserves MongoDB IDs, yarn masters, fabric specs (panno & PPI), loom configurations, and historical production sheets.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold mb-1">
              <FileCheck size={14} className="text-emerald-400" />
              <span>SHA-256 Checksums</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Every collection file is hashed with SHA-256 to ensure zero corruption or tampering during storage.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold mb-1">
              <ShieldAlert size={14} className="text-amber-400" />
              <span>Zero Token Leakage</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Bcrypt credentials are included for user continuity. Active session cookies, refresh tokens, and server secrets are strictly excluded.
            </p>
          </div>
        </div>

        {lastExportedFile && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>
              Last backup generated: <strong>{lastExportedFile}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: IMPORT, VALIDATE & RESTORE                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 sm:p-8 border border-slate-800">
        <div className="pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Upload className="text-indigo-400" size={22} />
            <h3 className="text-lg font-bold text-slate-100">Restore & Import Company Backup</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Upload an existing SBKT backup archive (.zip). Review the validated manifest and choose either Full Replace Restore or Merge Import.
          </p>
        </div>

        {/* Step A: File Upload / Dropzone */}
        <div className="mt-6">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Select Backup Archive (.zip)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-900/50 rounded-xl p-6 text-center transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3 rounded-full bg-slate-800 text-slate-300 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                <Upload size={20} />
              </div>
              <p className="text-sm font-medium text-slate-200">
                {selectedFile ? selectedFile.name : 'Click to select or drag and drop backup file'}
              </p>
              <p className="text-xs text-slate-500">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                  : 'ZIP archive format (up to 50MB)'}
              </p>
            </div>
          </div>
        </div>

        {/* Validation Progress */}
        {validating && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Loader2 size={14} className="animate-spin text-blue-400" />
            <span>Validating archive integrity, checksums, and schema...</span>
          </div>
        )}

        {/* Validation Errors */}
        {validationResult && !validationResult.valid && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <XCircle size={16} />
              <span>Archive Validation Failed</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-rose-400">
              {validationResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step B: Archive Metadata & Collection Preview */}
        {validationResult && validationResult.valid && validationResult.manifest && (
          <div className="mt-6 space-y-6 animate-fade-in">
            {/* Validation Banner */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>
                  Archive Verified: <strong>{validationResult.manifest.backupFormat}</strong> (v{validationResult.manifest.version})
                </span>
              </div>
              <span className="text-slate-400">
                Created: {new Date(validationResult.manifest.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle size={15} />
                  <span>Important Notice</span>
                </div>
                {validationResult.warnings.map((w, idx) => (
                  <p key={idx} className="text-amber-300/90">{w}</p>
                ))}
              </div>
            )}

            {/* Collection Inventory Table */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Layers size={14} className="text-blue-400" />
                <span>Collection Inventory ({validationResult.totalRecords} total records)</span>
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Collection</th>
                      <th className="py-2.5 px-4">Archived File</th>
                      <th className="py-2.5 px-4 text-right">Records</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {validationResult.manifest.collections.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-4 font-medium text-slate-200">{col.name}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">{col.file}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-100">{col.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step C: Mode Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-3">
                Choose Restore Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mode A: Replace */}
                <div
                  onClick={() => setRestoreMode('REPLACE')}
                  className={`cursor-pointer rounded-xl p-4 border transition-all ${
                    restoreMode === 'REPLACE'
                      ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-rose-300 text-sm mb-1">
                    <ShieldAlert size={16} />
                    <span>Mode A: Full Replace Restore</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Replaces current company data with the validated backup records. A safety backup of current data is automatically captured prior to replacement.
                  </p>
                </div>

                {/* Mode B: Merge */}
                <div
                  onClick={() => setRestoreMode('MERGE')}
                  className={`cursor-pointer rounded-xl p-4 border transition-all ${
                    restoreMode === 'MERGE'
                      ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-blue-300 text-sm mb-1">
                    <RefreshCw size={16} />
                    <span>Mode B: Merge Import</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Non-destructive import. Inserts new non-conflicting records while preserving existing records. Duplicate keys and machine numbers are skipped.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Trigger */}
            <div className="pt-2 flex items-center justify-end">
              {restoreMode === 'REPLACE' ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={restoring}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-98 transition-all shadow-lg shadow-rose-500/25"
                >
                  <AlertTriangle size={16} />
                  <span>Proceed to Replace Restore</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={restoring}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {restoring ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Merging Records...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Execute Merge Import</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step D: Restore Results Summary */}
        {restoreSummary && (
          <div className="mt-8 p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>Restoration Completed Successfully ({restoreSummary.mode} MODE)</span>
              </div>
              <span className="text-xs text-slate-400">
                {new Date(restoreSummary.restoredAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Total Inserted</span>
                <span className="text-lg font-bold text-emerald-400">{restoreSummary.totalInserted}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Total Skipped</span>
                <span className="text-lg font-bold text-amber-400">{restoreSummary.totalSkipped}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Safety Snapshot</span>
                <span className="text-sm font-semibold text-slate-200">
                  {restoreSummary.safetyBackupCreated ? 'Created' : 'Not Required'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* FULL REPLACE CONFIRMATION MODAL                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-slate-900 border border-rose-500/30 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-rose-400 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/20">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Full Replace Restore</h3>
                <p className="text-xs text-rose-300">Destructive operation — requires verification</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                You are about to replace all current records for this company with data from{' '}
                <strong className="text-white">{selectedFile?.name}</strong>.
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                ⚠️ A temporary in-memory safety snapshot is automatically captured. If any database write fails, the system will automatically roll back.
              </div>
              <p>
                To confirm this operation, please type <strong className="text-white">RESTORE COMPANY DATA</strong> below:
              </p>
            </div>

            <input
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder="Type RESTORE COMPANY DATA"
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmationPhrase('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={confirmationPhrase !== 'RESTORE COMPANY DATA' || restoring}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-98 transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoring ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Restoring Company Data...</span>
                  </>
                ) : (
                  <span>I understand, Replace Company Data</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
