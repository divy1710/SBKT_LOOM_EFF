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
  checksumPolicy: 'SHA256';
  userSecurityPolicy: 'BCRYPT_HASHED_PASSWORDS_EXCLUDED_ACTIVE_SESSIONS';
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
