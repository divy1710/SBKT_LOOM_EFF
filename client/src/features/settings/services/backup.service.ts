import apiClient from '@/lib/axios';

export interface CollectionInventoryItem {
  name: string;
  file: string;
  count: number;
}

export interface BackupManifest {
  backupFormat: 'SBKT_BACKUP_V1';
  version: string;
  application: string;
  createdAt: string;
  factoryId: string;
  factoryCode: string;
  factoryName: string;
  collections: CollectionInventoryItem[];
  totalRecords: number;
  environment: string;
}

export interface ValidateBackupResult {
  valid: boolean;
  manifest?: BackupManifest;
  recordCounts: Record<string, number>;
  totalRecords: number;
  warnings: string[];
  errors: string[];
}

export interface RestoreSummary {
  mode: 'REPLACE' | 'MERGE';
  targetFactoryId: string;
  targetFactoryName: string;
  restoredAt: string;
  safetyBackupCreated: boolean;
  counts: {
    inserted: Record<string, number>;
    skipped: Record<string, number>;
    conflicts: Record<string, number>;
  };
  totalInserted: number;
  totalSkipped: number;
  warnings: string[];
}

export const backupClientService = {
  /**
   * Triggers download of the complete company backup ZIP archive
   */
  async downloadFullBackup(): Promise<string> {
    const res = await apiClient.get('/backup/export', {
      responseType: 'blob',
    });

    let filename = 'SBKT_Full_Backup.zip';
    const disposition = res.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return filename;
  },

  /**
   * Uploads and validates a backup ZIP archive without altering the database
   */
  async validateBackup(file: File): Promise<ValidateBackupResult> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<{ data: ValidateBackupResult }>(
      '/backup/validate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return res.data.data;
  },

  /**
   * Mode A: Full Replace Restore (destructive replacement with safety backup)
   */
  async restoreFullReplace(file: File, confirmationPhrase: string): Promise<RestoreSummary> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confirmationPhrase', confirmationPhrase);

    const res = await apiClient.post<{ data: RestoreSummary }>(
      '/backup/restore/replace',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return res.data.data;
  },

  /**
   * Mode B: Merge Import (non-destructive record merge)
   */
  async restoreMerge(file: File): Promise<RestoreSummary> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<{ data: RestoreSummary }>(
      '/backup/restore/merge',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return res.data.data;
  },
};
