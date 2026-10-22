import crypto from 'crypto';
import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { Factory } from '../factory/factory.model';
import { User, IUser } from '../user/user.model';
import { Yarn } from '../yarn/yarn.model';
import { Fabric } from '../fabric/fabric.model';
import { Beam } from '../beam/beam.model';
import { BeamLoadingHistory } from '../beam/beam-history.model';
import { Machine } from '../machine/machine.model';
import { ProductionSheet } from '../production/production.model';
import {
  BackupManifest,
  ValidateBackupResult,
  RestoreSummary,
  CollectionInventoryItem,
} from './backup.types';

const BACKUP_FORMAT = 'SBKT_BACKUP_V1';
const BACKUP_VERSION = '1.0.0';
const APPLICATION_NAME = 'SBKT Loom Production & Efficiency Management System';

const ALLOWED_ENTRIES = new Set([
  'manifest.json',
  'checksums.json',
  'data/factory.json',
  'data/users.json',
  'data/yarns.json',
  'data/fabrics.json',
  'data/beams.json',
  'data/beam_histories.json',
  'data/machines.json',
  'data/production_sheets.json',
]);

export class BackupService {
  /**
   * Helper to compute SHA-256 hex string of content buffer
   */
  private computeSha256(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Formats a local timestamp string for filenames: YYYY-MM-DD_HH-mm-ss
   */
  private formatTimestamp(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
  }

  /**
   * Generates a complete company backup ZIP archive in memory
   */
  async createFullBackup(
    factoryId: string,
    actorRole: string,
  ): Promise<{ buffer: Buffer; filename: string; manifest: BackupManifest }> {
    if (!mongoose.Types.ObjectId.isValid(factoryId)) {
      throw ApiError.badRequest('Invalid factory identifier.');
    }

    const factory = await Factory.findById(factoryId).lean();
    if (!factory) {
      throw ApiError.notFound('Factory not found.');
    }

    const factoryObjId = new mongoose.Types.ObjectId(factoryId);

    // 1. Query all 8 collections strictly isolated by factoryId
    const [
      rawUsers,
      yarns,
      fabrics,
      beams,
      beamHistories,
      machines,
      productionSheets,
    ] = await Promise.all([
      // Retain passwordHash for account restoration continuity; exclude tokens/sessions
      User.find({ factoryId: factoryObjId }).select('+passwordHash').lean(),
      Yarn.find({ factoryId: factoryObjId }).lean(),
      Fabric.find({ factoryId: factoryObjId }).lean(),
      Beam.find({ factoryId: factoryObjId }).lean(),
      BeamLoadingHistory.find({ factoryId: factoryObjId }).lean(),
      Machine.find({ factoryId: factoryObjId }).lean(),
      ProductionSheet.find({ factoryId: factoryObjId }).lean(),
    ]);

    // Sanitize user records to guarantee no session tokens or temporary secrets leak
    const users = rawUsers.map((u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      factoryId: u.factoryId,
      preferences: u.preferences,
      isActive: u.isActive,
      passwordHash: u.passwordHash,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    // 2. Prepare JSON contents with consistent stringification
    const factoryJson = JSON.stringify(factory, null, 2);
    const usersJson = JSON.stringify(users, null, 2);
    const yarnsJson = JSON.stringify(yarns, null, 2);
    const fabricsJson = JSON.stringify(fabrics, null, 2);
    const beamsJson = JSON.stringify(beams, null, 2);
    const beamHistoriesJson = JSON.stringify(beamHistories, null, 2);
    const machinesJson = JSON.stringify(machines, null, 2);
    const productionSheetsJson = JSON.stringify(productionSheets, null, 2);

    // 3. Compute SHA-256 checksums
    const checksums: Record<string, string> = {
      'data/factory.json': this.computeSha256(factoryJson),
      'data/users.json': this.computeSha256(usersJson),
      'data/yarns.json': this.computeSha256(yarnsJson),
      'data/fabrics.json': this.computeSha256(fabricsJson),
      'data/beams.json': this.computeSha256(beamsJson),
      'data/beam_histories.json': this.computeSha256(beamHistoriesJson),
      'data/machines.json': this.computeSha256(machinesJson),
      'data/production_sheets.json': this.computeSha256(productionSheetsJson),
    };
    const checksumsJson = JSON.stringify(checksums, null, 2);

    // 4. Build collection inventory & manifest
    const collections: CollectionInventoryItem[] = [
      { name: 'Factory Profile & Settings', file: 'data/factory.json', count: 1 },
      { name: 'User Accounts & Roles', file: 'data/users.json', count: users.length },
      { name: 'Yarn Master', file: 'data/yarns.json', count: yarns.length },
      { name: 'Fabric Master', file: 'data/fabrics.json', count: fabrics.length },
      { name: 'Beam Master', file: 'data/beams.json', count: beams.length },
      { name: 'Beam Loading History', file: 'data/beam_histories.json', count: beamHistories.length },
      { name: 'Machine Looms', file: 'data/machines.json', count: machines.length },
      { name: 'Production Sheets', file: 'data/production_sheets.json', count: productionSheets.length },
    ];

    const totalRecords = collections.reduce((acc, c) => acc + c.count, 0);

    const manifest: BackupManifest = {
      backupFormat: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      application: APPLICATION_NAME,
      createdAt: new Date().toISOString(),
      factoryId: factory._id.toString(),
      factoryCode: factory.code,
      factoryName: factory.name,
      collections,
      totalRecords,
      environment: process.env.NODE_ENV || 'production',
      checksumPolicy: 'SHA256',
      userSecurityPolicy: 'BCRYPT_HASHED_PASSWORDS_EXCLUDED_ACTIVE_SESSIONS',
    };
    const manifestJson = JSON.stringify(manifest, null, 2);

    // 5. Build ZIP archive in-memory
    const zip = new AdmZip();
    zip.addFile('manifest.json', Buffer.from(manifestJson, 'utf-8'));
    zip.addFile('checksums.json', Buffer.from(checksumsJson, 'utf-8'));
    zip.addFile('data/factory.json', Buffer.from(factoryJson, 'utf-8'));
    zip.addFile('data/users.json', Buffer.from(usersJson, 'utf-8'));
    zip.addFile('data/yarns.json', Buffer.from(yarnsJson, 'utf-8'));
    zip.addFile('data/fabrics.json', Buffer.from(fabricsJson, 'utf-8'));
    zip.addFile('data/beams.json', Buffer.from(beamsJson, 'utf-8'));
    zip.addFile('data/beam_histories.json', Buffer.from(beamHistoriesJson, 'utf-8'));
    zip.addFile('data/machines.json', Buffer.from(machinesJson, 'utf-8'));
    zip.addFile('data/production_sheets.json', Buffer.from(productionSheetsJson, 'utf-8'));

    const buffer = zip.toBuffer();
    const safeCode = (factory.code || 'SBKT').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${safeCode}_Full_Backup_${this.formatTimestamp()}.zip`;

    return { buffer, filename, manifest };
  }

  /**
   * Validates uploaded backup ZIP archive structure, checksums, and manifest without altering DB
   */
  async validateBackupArchive(
    zipBuffer: Buffer,
    targetFactoryId?: string,
  ): Promise<ValidateBackupResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recordCounts: Record<string, number> = {};

    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch {
      return {
        valid: false,
        recordCounts: {},
        totalRecords: 0,
        warnings: [],
        errors: ['Uploaded file is not a valid ZIP archive.'],
      };
    }

    const entries = zip.getEntries();
    if (entries.length === 0) {
      return {
        valid: false,
        recordCounts: {},
        totalRecords: 0,
        warnings: [],
        errors: ['Archive is empty.'],
      };
    }

    // Path traversal check & allowlist check
    for (const entry of entries) {
      const name = entry.entryName.replace(/\\/g, '/');
      if (entry.isDirectory) continue;
      if (name.includes('..') || name.startsWith('/')) {
        errors.push(`Disallowed path traversal in archive: ${name}`);
      }
      if (!ALLOWED_ENTRIES.has(name)) {
        errors.push(`Unauthorized or unknown entry in archive: ${name}`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, recordCounts, totalRecords: 0, warnings, errors };
    }

    // Extract manifest
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      errors.push('Archive is missing required manifest.json file.');
      return { valid: false, recordCounts, totalRecords: 0, warnings, errors };
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
    } catch {
      errors.push('manifest.json contains invalid JSON.');
      return { valid: false, recordCounts, totalRecords: 0, warnings, errors };
    }

    if (manifest.backupFormat !== BACKUP_FORMAT) {
      errors.push(`Unsupported backup format: ${manifest.backupFormat}. Expected ${BACKUP_FORMAT}.`);
    }

    // Extract checksums
    const checksumsEntry = zip.getEntry('checksums.json');
    if (!checksumsEntry) {
      errors.push('Archive is missing required checksums.json integrity file.');
      return { valid: false, recordCounts, totalRecords: 0, warnings, errors };
    }

    let checksums: Record<string, string>;
    try {
      checksums = JSON.parse(checksumsEntry.getData().toString('utf-8'));
    } catch {
      errors.push('checksums.json contains invalid JSON.');
      return { valid: false, recordCounts, totalRecords: 0, warnings, errors };
    }

    // Verify each data file
    const requiredDataFiles = [
      'data/factory.json',
      'data/users.json',
      'data/yarns.json',
      'data/fabrics.json',
      'data/beams.json',
      'data/beam_histories.json',
      'data/machines.json',
      'data/production_sheets.json',
    ];

    let totalRecords = 0;

    for (const file of requiredDataFiles) {
      const entry = zip.getEntry(file);
      if (!entry) {
        errors.push(`Missing required collection file: ${file}`);
        continue;
      }

      const content = entry.getData();
      const actualHash = this.computeSha256(content);
      const expectedHash = checksums[file];

      if (!expectedHash || actualHash !== expectedHash) {
        errors.push(`Integrity checksum mismatch for ${file}. File may be corrupted.`);
        continue;
      }

      try {
        const parsed = JSON.parse(content.toString('utf-8'));
        const keyMap: Record<string, string> = {
          'data/factory.json': 'factory',
          'data/users.json': 'users',
          'data/yarns.json': 'yarns',
          'data/fabrics.json': 'fabrics',
          'data/beams.json': 'beams',
          'data/beam_histories.json': 'beamHistories',
          'data/machines.json': 'machines',
          'data/production_sheets.json': 'productionSheets',
        };
        const key = keyMap[file] || file.replace('data/', '').replace('.json', '');
        const count = Array.isArray(parsed) ? parsed.length : parsed ? 1 : 0;
        recordCounts[key] = count;
        // Also provide snake_case alias
        const rawKey = file.replace('data/', '').replace('.json', '');
        recordCounts[rawKey] = count;
        totalRecords += count;
      } catch {
        errors.push(`Malformed JSON data in ${file}.`);
      }
    }

    // Check company tenant match
    if (targetFactoryId && manifest.factoryId && targetFactoryId !== manifest.factoryId) {
      warnings.push(
        `Source company in backup (${manifest.factoryName} [${manifest.factoryCode}]) differs from the current company destination. Restoring will apply this data to the destination company.`,
      );
    }

    return {
      valid: errors.length === 0,
      manifest,
      recordCounts,
      totalRecords,
      warnings,
      errors,
    };
  }

  /**
   * Captures in-memory safety snapshot of current company records
   */
  private async captureSafetySnapshot(factoryObjId: mongoose.Types.ObjectId) {
    const [
      factory,
      users,
      yarns,
      fabrics,
      beams,
      beamHistories,
      machines,
      productionSheets,
    ] = await Promise.all([
      Factory.findById(factoryObjId).lean(),
      User.find({ factoryId: factoryObjId }).select('+passwordHash').lean(),
      Yarn.find({ factoryId: factoryObjId }).lean(),
      Fabric.find({ factoryId: factoryObjId }).lean(),
      Beam.find({ factoryId: factoryObjId }).lean(),
      BeamLoadingHistory.find({ factoryId: factoryObjId }).lean(),
      Machine.find({ factoryId: factoryObjId }).lean(),
      ProductionSheet.find({ factoryId: factoryObjId }).lean(),
    ]);

    return {
      factory,
      users,
      yarns,
      fabrics,
      beams,
      beamHistories,
      machines,
      productionSheets,
    };
  }

  /**
   * Mode A: Full Replace Restore
   * Replaces target company's current data with verified backup dataset.
   * Safety backup is created first. Rollback is executed if any insertion fails.
   */
  async restoreFullReplace(
    zipBuffer: Buffer,
    targetFactoryId: string,
    actorUserId: string,
    confirmationPhrase: string,
  ): Promise<RestoreSummary> {
    if (confirmationPhrase !== 'RESTORE COMPANY DATA') {
      throw ApiError.badRequest(
        'Confirmation phrase must exactly match "RESTORE COMPANY DATA" to proceed with full replace.',
      );
    }

    if (!mongoose.Types.ObjectId.isValid(targetFactoryId)) {
      throw ApiError.badRequest('Invalid destination factory ID.');
    }

    const validation = await this.validateBackupArchive(zipBuffer, targetFactoryId);
    if (!validation.valid || !validation.manifest) {
      throw ApiError.badRequest(
        `Archive validation failed: ${validation.errors.join('; ')}`,
      );
    }

    const factoryObjId = new mongoose.Types.ObjectId(targetFactoryId);
    const existingFactory = await Factory.findById(factoryObjId);
    if (!existingFactory) {
      throw ApiError.notFound('Target factory not found.');
    }

    // 1. Capture in-memory safety snapshot for rollback guarantee
    const safetySnapshot = await this.captureSafetySnapshot(factoryObjId);

    const zip = new AdmZip(zipBuffer);

    const readJson = (file: string) => {
      const entry = zip.getEntry(file);
      if (!entry) return null;
      return JSON.parse(entry.getData().toString('utf-8'));
    };

    const incomingFactory = readJson('data/factory.json');
    const incomingUsers: any[] = readJson('data/users.json') || [];
    const incomingYarns: any[] = readJson('data/yarns.json') || [];
    const incomingFabrics: any[] = readJson('data/fabrics.json') || [];
    const incomingBeams: any[] = readJson('data/beams.json') || [];
    const incomingHistories: any[] = readJson('data/beam_histories.json') || [];
    const incomingMachines: any[] = readJson('data/machines.json') || [];
    const incomingSheets: any[] = readJson('data/production_sheets.json') || [];

    // Helper to remap document factoryId to targetFactoryId while preserving original _id and references
    const remapFactoryId = (docs: any[]) =>
      docs.map((doc) => ({
        ...doc,
        factoryId: factoryObjId,
      }));

    try {
      // 2. Clear current factory-scoped collections
      await Promise.all([
        Yarn.deleteMany({ factoryId: factoryObjId }),
        Fabric.deleteMany({ factoryId: factoryObjId }),
        Beam.deleteMany({ factoryId: factoryObjId }),
        BeamLoadingHistory.deleteMany({ factoryId: factoryObjId }),
        Machine.deleteMany({ factoryId: factoryObjId }),
        ProductionSheet.deleteMany({ factoryId: factoryObjId }),
        User.deleteMany({ factoryId: factoryObjId }),
      ]);

      // 3. Update Factory details
      if (incomingFactory) {
        existingFactory.name = incomingFactory.name || existingFactory.name;
        if (incomingFactory.code) existingFactory.code = incomingFactory.code;
        if (incomingFactory.address !== undefined) existingFactory.address = incomingFactory.address;
        if (incomingFactory.phone !== undefined) existingFactory.phone = incomingFactory.phone;
        if (incomingFactory.email !== undefined) existingFactory.email = incomingFactory.email;
        if (incomingFactory.logo !== undefined) existingFactory.logo = incomingFactory.logo;
        if (incomingFactory.timezone) existingFactory.timezone = incomingFactory.timezone;
        if (incomingFactory.productionPreferences) {
          existingFactory.productionPreferences = incomingFactory.productionPreferences;
        }
        await existingFactory.save();
      }

      // 4. Insert restored records
      if (incomingUsers.length > 0) {
        await User.insertMany(remapFactoryId(incomingUsers), { ordered: false });
      }
      if (incomingYarns.length > 0) {
        await Yarn.insertMany(remapFactoryId(incomingYarns), { ordered: false });
      }
      if (incomingFabrics.length > 0) {
        await Fabric.insertMany(remapFactoryId(incomingFabrics), { ordered: false });
      }
      if (incomingBeams.length > 0) {
        await Beam.insertMany(remapFactoryId(incomingBeams), { ordered: false });
      }
      if (incomingHistories.length > 0) {
        await BeamLoadingHistory.insertMany(remapFactoryId(incomingHistories), { ordered: false });
      }
      if (incomingMachines.length > 0) {
        await Machine.insertMany(remapFactoryId(incomingMachines), { ordered: false });
      }
      if (incomingSheets.length > 0) {
        await ProductionSheet.insertMany(remapFactoryId(incomingSheets), { ordered: false });
      }

      const insertedCounts: Record<string, number> = {
        factory: 1,
        users: incomingUsers.length,
        yarns: incomingYarns.length,
        fabrics: incomingFabrics.length,
        beams: incomingBeams.length,
        beamHistories: incomingHistories.length,
        machines: incomingMachines.length,
        productionSheets: incomingSheets.length,
      };

      const totalInserted = Object.values(insertedCounts).reduce((a, b) => a + b, 0);

      return {
        mode: 'REPLACE',
        targetFactoryId,
        targetFactoryName: existingFactory.name,
        restoredAt: new Date().toISOString(),
        safetyBackupCreated: true,
        counts: {
          inserted: insertedCounts,
          skipped: {},
          conflicts: {},
        },
        totalInserted,
        totalSkipped: 0,
        warnings: validation.warnings,
      };
    } catch (restoreErr: any) {
      // 5. Safe Rollback from Safety Snapshot
      console.error('[BackupService] Replace restore failed. Executing safety rollback...', restoreErr);
      try {
        await Promise.all([
          Yarn.deleteMany({ factoryId: factoryObjId }),
          Fabric.deleteMany({ factoryId: factoryObjId }),
          Beam.deleteMany({ factoryId: factoryObjId }),
          BeamLoadingHistory.deleteMany({ factoryId: factoryObjId }),
          Machine.deleteMany({ factoryId: factoryObjId }),
          ProductionSheet.deleteMany({ factoryId: factoryObjId }),
          User.deleteMany({ factoryId: factoryObjId }),
        ]);

        if (safetySnapshot.users.length > 0) await User.insertMany(safetySnapshot.users, { ordered: false });
        if (safetySnapshot.yarns.length > 0) await Yarn.insertMany(safetySnapshot.yarns, { ordered: false });
        if (safetySnapshot.fabrics.length > 0) await Fabric.insertMany(safetySnapshot.fabrics, { ordered: false });
        if (safetySnapshot.beams.length > 0) await Beam.insertMany(safetySnapshot.beams, { ordered: false });
        if (safetySnapshot.beamHistories.length > 0) await BeamLoadingHistory.insertMany(safetySnapshot.beamHistories, { ordered: false });
        if (safetySnapshot.machines.length > 0) await Machine.insertMany(safetySnapshot.machines, { ordered: false });
        if (safetySnapshot.productionSheets.length > 0) await ProductionSheet.insertMany(safetySnapshot.productionSheets, { ordered: false });
      } catch (rollbackErr) {
        console.error('[BackupService] Rollback error:', rollbackErr);
      }

      throw ApiError.internal(`Restoration failed: ${restoreErr.message}. Safety rollback executed.`);
    }
  }

  /**
   * Mode B: Merge Import
   * Non-destructive merge: preserves current records, skips duplicates, and inserts missing records.
   */
  async restoreMerge(
    zipBuffer: Buffer,
    targetFactoryId: string,
    actorUserId: string,
  ): Promise<RestoreSummary> {
    if (!mongoose.Types.ObjectId.isValid(targetFactoryId)) {
      throw ApiError.badRequest('Invalid destination factory ID.');
    }

    const validation = await this.validateBackupArchive(zipBuffer, targetFactoryId);
    if (!validation.valid || !validation.manifest) {
      throw ApiError.badRequest(
        `Archive validation failed: ${validation.errors.join('; ')}`,
      );
    }

    const factoryObjId = new mongoose.Types.ObjectId(targetFactoryId);
    const existingFactory = await Factory.findById(factoryObjId);
    if (!existingFactory) {
      throw ApiError.notFound('Target factory not found.');
    }

    const zip = new AdmZip(zipBuffer);
    const readJson = (file: string) => {
      const entry = zip.getEntry(file);
      if (!entry) return [];
      return JSON.parse(entry.getData().toString('utf-8'));
    };

    const incomingUsers: any[] = readJson('data/users.json');
    const incomingYarns: any[] = readJson('data/yarns.json');
    const incomingFabrics: any[] = readJson('data/fabrics.json');
    const incomingBeams: any[] = readJson('data/beams.json');
    const incomingHistories: any[] = readJson('data/beam_histories.json');
    const incomingMachines: any[] = readJson('data/machines.json');
    const incomingSheets: any[] = readJson('data/production_sheets.json');

    const inserted: Record<string, number> = {
      users: 0,
      yarns: 0,
      fabrics: 0,
      beams: 0,
      beamHistories: 0,
      machines: 0,
      productionSheets: 0,
    };
    const skipped: Record<string, number> = {
      users: 0,
      yarns: 0,
      fabrics: 0,
      beams: 0,
      beamHistories: 0,
      machines: 0,
      productionSheets: 0,
    };
    const conflicts: Record<string, number> = {
      users: 0,
      yarns: 0,
      fabrics: 0,
      beams: 0,
      beamHistories: 0,
      machines: 0,
      productionSheets: 0,
    };

    // 1. Merge Users (match by _id or email)
    for (const u of incomingUsers) {
      const existing = await User.findOne({
        $or: [{ _id: u._id }, { email: u.email.toLowerCase() }],
      });
      if (existing) {
        skipped.users++;
      } else {
        try {
          await User.create({ ...u, factoryId: factoryObjId });
          inserted.users++;
        } catch {
          conflicts.users++;
        }
      }
    }

    // 2. Merge Yarns (match by _id or normalizedName within factory)
    for (const y of incomingYarns) {
      const normName = (y.normalizedName || y.name || '').trim().toLowerCase();
      const existing = await Yarn.findOne({
        factoryId: factoryObjId,
        $or: [{ _id: y._id }, { normalizedName: normName }],
      });
      if (existing) {
        skipped.yarns++;
      } else {
        try {
          await Yarn.create({ ...y, factoryId: factoryObjId, normalizedName: normName });
          inserted.yarns++;
        } catch {
          conflicts.yarns++;
        }
      }
    }

    // 3. Merge Fabrics (match by _id or code within factory)
    for (const f of incomingFabrics) {
      const normCode = (f.normalizedCode || f.code || '').trim().toLowerCase();
      const existing = await Fabric.findOne({
        factoryId: factoryObjId,
        $or: [{ _id: f._id }, { normalizedCode: normCode }],
      });
      if (existing) {
        skipped.fabrics++;
      } else {
        try {
          await Fabric.create({ ...f, factoryId: factoryObjId, normalizedCode: normCode });
          inserted.fabrics++;
        } catch {
          conflicts.fabrics++;
        }
      }
    }

    // 4. Merge Beams (match by _id or beamNumber within factory)
    for (const b of incomingBeams) {
      const normBeamNumber = (b.normalizedBeamNumber || b.beamNumber || '').trim().toUpperCase();
      const existing = await Beam.findOne({
        factoryId: factoryObjId,
        $or: [{ _id: b._id }, { normalizedBeamNumber: normBeamNumber }],
      });
      if (existing) {
        skipped.beams++;
      } else {
        try {
          await Beam.create({ ...b, factoryId: factoryObjId, normalizedBeamNumber: normBeamNumber });
          inserted.beams++;
        } catch {
          conflicts.beams++;
        }
      }
    }

    // 5. Merge Beam Loading History (match by _id)
    for (const h of incomingHistories) {
      const existing = await BeamLoadingHistory.findOne({
        factoryId: factoryObjId,
        _id: h._id,
      });
      if (existing) {
        skipped.beamHistories++;
      } else {
        try {
          await BeamLoadingHistory.create({ ...h, factoryId: factoryObjId });
          inserted.beamHistories++;
        } catch {
          conflicts.beamHistories++;
        }
      }
    }

    // 6. Merge Machines (match by _id or machineNumber within factory)
    for (const m of incomingMachines) {
      const normMachineNumber = (m.normalizedMachineNumber || m.machineNumber || '').trim().toUpperCase();
      const existing = await Machine.findOne({
        factoryId: factoryObjId,
        $or: [{ _id: m._id }, { normalizedMachineNumber: normMachineNumber }],
      });
      if (existing) {
        skipped.machines++;
      } else {
        try {
          await Machine.create({ ...m, factoryId: factoryObjId, normalizedMachineNumber: normMachineNumber });
          inserted.machines++;
        } catch {
          conflicts.machines++;
        }
      }
    }

    // 7. Merge Production Sheets (match by _id or productionDate + shift)
    for (const s of incomingSheets) {
      const existing = await ProductionSheet.findOne({
        factoryId: factoryObjId,
        $or: [
          { _id: s._id },
          { productionDate: new Date(s.productionDate), shift: s.shift },
        ],
      });
      if (existing) {
        skipped.productionSheets++;
      } else {
        try {
          await ProductionSheet.create({ ...s, factoryId: factoryObjId });
          inserted.productionSheets++;
        } catch {
          conflicts.productionSheets++;
        }
      }
    }

    const totalInserted = Object.values(inserted).reduce((a, b) => a + b, 0);
    const totalSkipped = Object.values(skipped).reduce((a, b) => a + b, 0);

    return {
      mode: 'MERGE',
      targetFactoryId,
      targetFactoryName: existingFactory.name,
      restoredAt: new Date().toISOString(),
      safetyBackupCreated: false,
      counts: {
        inserted,
        skipped,
        conflicts,
      },
      totalInserted,
      totalSkipped,
      warnings: validation.warnings,
    };
  }
}

export const backupService = new BackupService();
