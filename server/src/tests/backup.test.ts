import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { User, UserRole } from '../modules/user/user.model';
import { Factory } from '../modules/factory/factory.model';
import { Yarn, YarnType, RateUnit } from '../modules/yarn/yarn.model';
import { Fabric } from '../modules/fabric/fabric.model';
import { Beam, BeamStatus } from '../modules/beam/beam.model';
import { BeamLoadingHistory } from '../modules/beam/beam-history.model';
import { Machine, MachineStatus } from '../modules/machine/machine.model';
import {
  ProductionSheet,
  ShiftType,
  ProductionSheetStatus,
  EfficiencyMode,
  ProductionMachineStatus,
} from '../modules/production/production.model';
import { signAccessToken } from '../utils/jwt';

const app = createApp();
const agent = request(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createTestFactory(code = 'SBKT01', name = 'Shree Brahmanikrupa Textile') {
  return Factory.create({
    name,
    code,
    timezone: 'Asia/Kolkata',
    isActive: true,
  });
}

async function createTestUser(overrides: Partial<{
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  factoryId: Types.ObjectId;
}> = {}) {
  const password = overrides.password ?? 'TestPassword123!';
  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    passwordHash,
    role: overrides.role ?? UserRole.OPERATOR,
    isActive: overrides.isActive ?? true,
    factoryId: overrides.factoryId,
  });
}

function authHeader(user: { _id: Types.ObjectId; role: UserRole; factoryId?: Types.ObjectId }) {
  const token = signAccessToken(user._id, user.role, user.factoryId);
  return { Cookie: `sbkt_token=${token}` };
}

describe('Phase 10 — Complete Company Backup, Export, Validate & Restore', () => {
  let factoryA: any;
  let factoryB: any;
  let adminA: any;
  let operatorA: any;
  let adminB: any;

  let yarnWarp: any;
  let yarnWeft: any;
  let fabric: any;
  let beam: any;
  let machine: any;
  let productionSheet: any;

  beforeEach(async () => {
    // 1. Create Factories
    factoryA = await createTestFactory('SBKT01', 'Shree Brahmanikrupa Textile');
    factoryB = await createTestFactory('SBKT02', 'Second Textile Unit');

    // 2. Create Users
    adminA = await createTestUser({
      name: 'Admin A',
      email: 'admin.a@sbkt.com',
      role: UserRole.FACTORY_ADMIN,
      factoryId: factoryA._id,
    });

    operatorA = await createTestUser({
      name: 'Operator A',
      email: 'operator.a@sbkt.com',
      role: UserRole.OPERATOR,
      factoryId: factoryA._id,
    });

    adminB = await createTestUser({
      name: 'Admin B',
      email: 'admin.b@sbkt.com',
      role: UserRole.FACTORY_ADMIN,
      factoryId: factoryB._id,
    });

    // 3. Create Populated Dataset for Factory A
    yarnWarp = await Yarn.create({
      name: 'Bright Polyester 50D',
      normalizedName: 'bright polyester 50d',
      denier: 50,
      yarnType: YarnType.WARP,
      rate: 145,
      rateUnit: RateUnit.KG,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    yarnWeft = await Yarn.create({
      name: 'Textured Poly 75D',
      normalizedName: 'textured poly 75d',
      denier: 75,
      yarnType: YarnType.WEFT,
      rate: 130,
      rateUnit: RateUnit.KG,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    fabric = await Fabric.create({
      name: 'Royal Chiffon 50x75',
      normalizedName: 'royal chiffon 50x75',
      code: 'RC-101',
      normalizedCode: 'rc-101',
      warpYarnId: yarnWarp._id,
      weftYarnId: yarnWeft._id,
      ppi: 68,
      panno: 48.5,
      wastagePercent: 2.5,
      recommendedRpm: 650,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    beam = await Beam.create({
      beamNumber: 'BM-2026-001',
      normalizedBeamNumber: 'BM-2026-001',
      factoryId: factoryA._id,
      fabricId: fabric._id,
      warpYarnId: yarnWarp._id,
      originalLengthMeters: 3000,
      remainingLengthMeters: 2450,
      ends: 4800,
      status: BeamStatus.LOADED,
      alertAtMeters: 200,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    machine = await Machine.create({
      machineNumber: 'M-01',
      normalizedMachineNumber: 'M-01',
      name: 'Toyota Waterjet Loom 01',
      factoryId: factoryA._id,
      fabricId: fabric._id,
      loadedBeamId: beam._id,
      rpm: 650,
      ppi: 68,
      status: MachineStatus.RUNNING,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    productionSheet = await ProductionSheet.create({
      factoryId: factoryA._id,
      productionDate: new Date('2026-10-21T00:00:00.000Z'),
      shift: ShiftType.DAY,
      shiftStart: new Date('2026-10-21T08:00:00.000Z'),
      shiftEnd: new Date('2026-10-21T19:00:00.000Z'),
      shiftDurationHours: 11,
      entries: [
        {
          machineId: machine._id,
          machineNumberSnapshot: 'M-01',
          fabricId: fabric._id,
          fabricNameSnapshot: 'Royal Chiffon 50x75',
          fabricCodeSnapshot: 'RC-101',
          shift: ShiftType.DAY,
          productionDate: new Date('2026-10-21T00:00:00.000Z'),
          actualProductionMeters: 240,
          efficiencyMode: EfficiencyMode.AUTO,
          efficiencyPercent: 91.5,
          rpmSnapshot: 650,
          ppiSnapshot: 68,
          shiftDurationHours: 11,
          theoreticalProductionMeters: 262.3,
          machineStatusSnapshot: ProductionMachineStatus.RUNNING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      totalProductionMeters: 240,
      runningMachineCount: 1,
      stoppedMachineCount: 0,
      maintenanceMachineCount: 0,
      averageEfficiency: 91.5,
      status: ProductionSheetStatus.COMPLETED,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });
  });

  // ─── 1. Export Full Backup ──────────────────────────────────────────────────
  describe('GET /api/v1/backup/export', () => {
    it('T01: Rejects unauthenticated request with 401', async () => {
      const res = await agent.get('/api/v1/backup/export');
      expect(res.status).toBe(401);
    });

    it('T02: Rejects non-admin OPERATOR role with 403', async () => {
      const res = await agent
        .get('/api/v1/backup/export')
        .set(authHeader(operatorA));
      expect(res.status).toBe(403);
    });

    it('T03: Factory Admin can export complete company backup as valid ZIP', async () => {
      const res = await agent
        .get('/api/v1/backup/export')
        .set(authHeader(adminA))
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/zip');
      expect(res.headers['content-disposition']).toContain('.zip');

      const zip = new AdmZip(res.body);
      const entries = zip.getEntries().map((e) => e.entryName);

      // Verify all required files are present in the archive
      expect(entries).toContain('manifest.json');
      expect(entries).toContain('checksums.json');
      expect(entries).toContain('data/factory.json');
      expect(entries).toContain('data/users.json');
      expect(entries).toContain('data/yarns.json');
      expect(entries).toContain('data/fabrics.json');
      expect(entries).toContain('data/beams.json');
      expect(entries).toContain('data/beam_histories.json');
      expect(entries).toContain('data/machines.json');
      expect(entries).toContain('data/production_sheets.json');

      // Verify Manifest
      const manifest = JSON.parse(zip.getEntry('manifest.json')!.getData().toString('utf-8'));
      expect(manifest.backupFormat).toBe('SBKT_BACKUP_V1');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.factoryCode).toBe('SBKT01');
      expect(manifest.totalRecords).toBeGreaterThan(0);

      // Verify Checksums match actual files
      const checksums = JSON.parse(zip.getEntry('checksums.json')!.getData().toString('utf-8'));
      const yarnsContent = zip.getEntry('data/yarns.json')!.getData();
      const calculatedHash = crypto.createHash('sha256').update(yarnsContent).digest('hex');
      expect(checksums['data/yarns.json']).toBe(calculatedHash);

      // Verify Yarns Data
      const yarnsData = JSON.parse(yarnsContent.toString('utf-8'));
      expect(yarnsData.length).toBe(2);
      expect(yarnsData[0].factoryId.toString()).toBe(factoryA._id.toString());

      // Verify Production Sheet Data preserves efficiency and embedded snapshots
      const sheetsData = JSON.parse(zip.getEntry('data/production_sheets.json')!.getData().toString('utf-8'));
      expect(sheetsData.length).toBe(1);
      expect(sheetsData[0].entries[0].actualProductionMeters).toBe(240);
      expect(sheetsData[0].entries[0].efficiencyPercent).toBe(91.5);
    });

    it('T04: Company isolation: Factory B export does not include Factory A data', async () => {
      const res = await agent
        .get('/api/v1/backup/export')
        .set(authHeader(adminB))
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        });

      expect(res.status).toBe(200);
      const zip = new AdmZip(res.body);
      const yarnsData = JSON.parse(zip.getEntry('data/yarns.json')!.getData().toString('utf-8'));
      expect(yarnsData.length).toBe(0); // Factory B has 0 yarns
    });
  });

  // ─── 2. Validate Backup Archive ─────────────────────────────────────────────
  describe('POST /api/v1/backup/validate', () => {
    it('T05: Rejects upload when no file is attached', async () => {
      const res = await agent
        .post('/api/v1/backup/validate')
        .set(authHeader(adminA));
      expect(res.status).toBe(400);
    });

    it('T06: Successfully validates a genuine backup archive and returns preview metadata', async () => {
      // 1. Export valid backup
      const exportRes = await agent
        .get('/api/v1/backup/export')
        .set(authHeader(adminA))
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        });

      // 2. Validate the exported buffer
      const res = await agent
        .post('/api/v1/backup/validate')
        .set(authHeader(adminA))
        .attach('file', exportRes.body, 'backup.zip');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.recordCounts.yarns).toBe(2);
      expect(res.body.data.recordCounts.machines).toBe(1);
      expect(res.body.data.recordCounts.productionSheets).toBe(1);
    });

    it('T07: Rejects corrupted archive with checksum tampering', async () => {
      // 1. Export valid backup
      const exportRes = await agent
        .get('/api/v1/backup/export')
        .set(authHeader(adminA))
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        });

      const zip = new AdmZip(exportRes.body);
      // Tamper with data/yarns.json without updating checksums
      zip.updateFile('data/yarns.json', Buffer.from('[{"name":"tampered"}]', 'utf-8'));
      const tamperedBuffer = zip.toBuffer();

      const res = await agent
        .post('/api/v1/backup/validate')
        .set(authHeader(adminA))
        .attach('file', tamperedBuffer, 'tampered.zip');

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.errors[0]).toContain('checksum mismatch');
    });

    it('T08: Rejects archive with malicious path traversal', async () => {
      const zip = new AdmZip();
      zip.addFile('manifest.json', Buffer.from('{}', 'utf-8'));
      zip.addFile('../evil.sh', Buffer.from('rm -rf /', 'utf-8'));

      const res = await agent
        .post('/api/v1/backup/validate')
        .set(authHeader(adminA))
        .attach('file', zip.toBuffer(), 'traversal.zip');

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(
        res.body.data.errors.some(
          (e: string) => e.includes('Disallowed path traversal') || e.includes('Unauthorized or unknown entry'),
        ),
      ).toBe(true);
    });
  });

  // ─── 3. Full Replace Restore ────────────────────────────────────────────────
  describe('POST /api/v1/backup/restore/replace', () => {
    it('T09: Rejects if confirmation phrase does not match RESTORE COMPANY DATA', async () => {
      // Export valid backup
      const exportRes = await agent
        .get('/api/v1/backup/export')
        .set(authHeader(adminA))
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        });

      const res = await agent
        .post('/api/v1/backup/restore/replace')
        .set(authHeader(adminA))
        .field('confirmationPhrase', 'wrong phrase')
        .attach('file', exportRes.body, 'backup.zip');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('RESTORE COMPANY DATA');
    });

    it('T10: Successfully restores company dataset via Full Replace and preserves IDs', async () => {
      // 1. Export valid backup of current state
      const exportRes = await agent
        .get('/api/v1/backup/export')
        .set(authHeader(adminA))
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        });

      // 2. Add an extra yarn in database that should be wiped by full replace
      await Yarn.create({
        name: 'Temporary Stray Yarn',
        normalizedName: 'temporary stray yarn',
        denier: 100,
        yarnType: YarnType.WARP,
        rate: 200,
        rateUnit: RateUnit.KG,
        factoryId: factoryA._id,
        isActive: true,
        createdBy: adminA._id,
        updatedBy: adminA._id,
      });

      expect(await Yarn.countDocuments({ factoryId: factoryA._id })).toBe(3);

      // 3. Restore backup
      const res = await agent
        .post('/api/v1/backup/restore/replace')
        .set(authHeader(adminA))
        .field('confirmationPhrase', 'RESTORE COMPANY DATA')
        .attach('file', exportRes.body, 'backup.zip');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mode).toBe('REPLACE');
      expect(res.body.data.safetyBackupCreated).toBe(true);

      // 4. Verify Database State
      const currentYarns = await Yarn.find({ factoryId: factoryA._id });
      expect(currentYarns.length).toBe(2); // Temporary Stray Yarn is gone
      expect(currentYarns.some((y) => y.name === 'Temporary Stray Yarn')).toBe(false);

      // Verify original _id preserved
      const restoredYarnWarp = await Yarn.findById(yarnWarp._id);
      expect(restoredYarnWarp).not.toBeNull();
      expect(restoredYarnWarp!.name).toBe('Bright Polyester 50D');

      // Verify restored machine still references fabric and beam
      const restoredMachine = await Machine.findById(machine._id);
      expect(restoredMachine).not.toBeNull();
      expect(restoredMachine!.fabricId.toString()).toBe(fabric._id.toString());
      expect(restoredMachine!.loadedBeamId!.toString()).toBe(beam._id.toString());
    });
  });

  // ─── 4. Merge Import ────────────────────────────────────────────────────────
  describe('POST /api/v1/backup/restore/merge', () => {
    it('T11: Merge preserves existing records and skips duplicates', async () => {
      // 1. Export current backup
      const exportRes = await agent
        .get('/api/v1/backup/export')
        .set(authHeader(adminA))
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(data, 'binary'));
          });
        });

      // 2. Perform merge import on the exact same factory
      const res = await agent
        .post('/api/v1/backup/restore/merge')
        .set(authHeader(adminA))
        .attach('file', exportRes.body, 'backup.zip');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mode).toBe('MERGE');

      // Existing records should be skipped
      expect(res.body.data.counts.skipped.yarns).toBe(2);
      expect(res.body.data.counts.skipped.machines).toBe(1);
      expect(res.body.data.counts.inserted.yarns).toBe(0);

      // Total yarns count remains 2
      expect(await Yarn.countDocuments({ factoryId: factoryA._id })).toBe(2);
    });
  });
});
