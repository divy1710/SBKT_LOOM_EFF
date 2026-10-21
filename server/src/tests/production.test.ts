import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { User, UserRole, IUser } from '../modules/user/user.model';
import { Factory, IFactory } from '../modules/factory/factory.model';
import { Yarn, YarnType } from '../modules/yarn/yarn.model';
import { Fabric, IFabric, normalizeFabricCode, normalizeFabricName } from '../modules/fabric/fabric.model';
import { Machine, IMachine, MachineStatus } from '../modules/machine/machine.model';
import {
  ProductionSheet,
  ShiftType,
  ProductionSheetStatus,
  EfficiencyMode,
  ProductionMachineStatus,
} from '../modules/production/production.model';
import {
  calculateTheoreticalProduction,
  calculateEfficiency,
  getShiftTimings,
} from '../modules/production/production.utils';
import { signAccessToken } from '../utils/jwt';

const app = createApp();
const agent = request(app);

let counter = 0;

async function createFactory(name: string, code: string): Promise<IFactory> {
  return Factory.create({
    name,
    code,
    timezone: 'Asia/Kolkata',
    isActive: true,
  });
}

async function createUser(
  email: string,
  role: UserRole,
  factoryId?: Types.ObjectId,
): Promise<IUser> {
  const passwordHash = await bcrypt.hash('Password123!@#', 10);
  return User.create({
    name: `${role} User`,
    email,
    passwordHash,
    role,
    isActive: true,
    factoryId,
  });
}

function getAuthCookie(user: IUser): string {
  const token = signAccessToken(user._id, user.role, user.factoryId);
  return `sbkt_token=${token}`;
}

async function createFabricHelper(
  factoryId: Types.ObjectId,
  userId: Types.ObjectId,
  name = 'NC CHIFFON',
  code = 'NC-CHIFFON',
): Promise<IFabric> {
  counter++;
  const yarn = await Yarn.create({
    name: `Yarn ${counter}`,
    denier: 60,
    yarnType: YarnType.WARP,
    rate: 250,
    rateUnit: 'KG',
    factoryId,
    isActive: true,
    createdBy: userId,
    updatedBy: userId,
  });

  return Fabric.create({
    name,
    normalizedName: normalizeFabricName(name),
    code,
    normalizedCode: normalizeFabricCode(code),
    factoryId,
    warpYarnId: yarn._id,
    weftYarnId: yarn._id,
    reed: 72,
    picks: 60,
    ppi: 60,
    panno: 44.5,
    wastagePercent: 2.5,
    recommendedRpm: 700,
    isActive: true,
    createdBy: userId,
    updatedBy: userId,
  });
}

async function createMachineHelper(
  factoryId: Types.ObjectId,
  fabricId: Types.ObjectId,
  userId: Types.ObjectId,
  machineNumber = 'WJ-01',
  rpm = 700,
  ppi = 60,
  status = MachineStatus.RUNNING,
): Promise<IMachine> {
  return Machine.create({
    machineNumber,
    normalizedMachineNumber: machineNumber.trim().toUpperCase(),
    name: `Loom ${machineNumber}`,
    factoryId,
    fabricId,
    rpm,
    ppi,
    status,
    isActive: true,
    createdBy: userId,
    updatedBy: userId,
  });
}

describe('Production Sheet Management Module (/api/v1/production-sheets)', () => {
  let factoryA: IFactory;
  let factoryB: IFactory;
  let adminA: IUser;
  let operatorA: IUser;
  let viewerA: IUser;
  let adminB: IUser;
  let fabricA: IFabric;
  let machine1: IMachine;
  let machine2: IMachine;
  let machine3: IMachine;

  beforeEach(async () => {
    counter++;
    factoryA = await createFactory(`Factory A ${counter}`, `FA${counter}`);
    factoryB = await createFactory(`Factory B ${counter}`, `FB${counter}`);

    adminA = await createUser(`adminA_${counter}@example.com`, UserRole.FACTORY_ADMIN, factoryA._id);
    operatorA = await createUser(`operatorA_${counter}@example.com`, UserRole.OPERATOR, factoryA._id);
    viewerA = await createUser(`viewerA_${counter}@example.com`, UserRole.VIEWER, factoryA._id);
    adminB = await createUser(`adminB_${counter}@example.com`, UserRole.FACTORY_ADMIN, factoryB._id);

    fabricA = await createFabricHelper(factoryA._id, adminA._id, 'NC CHIFFON', `NC-CH-${counter}`);
    machine1 = await createMachineHelper(factoryA._id, fabricA._id, adminA._id, 'WJ-01', 700, 60, MachineStatus.RUNNING);
    machine2 = await createMachineHelper(factoryA._id, fabricA._id, adminA._id, 'WJ-02', 700, 60, MachineStatus.STOPPED);
    machine3 = await createMachineHelper(factoryA._id, fabricA._id, adminA._id, 'WJ-03', 650, 60, MachineStatus.MAINTENANCE);
  });

  // ─── Mathematical Formulas ──────────────────────────────────────────────────
  describe('Mathematical Formulation Verification', () => {
    it('T01: Theoretical production formula matches textile specification', () => {
      // RPM = 700, PPI = 60, Shift = DAY (11h)
      // (700 * 60 * 11) / (39.37 * 60) = 462000 / 2362.2 = 195.58039... -> 195.58 meters
      const theoretical = calculateTheoreticalProduction(700, 60, 11);
      expect(theoretical).toBe(195.58);
    });

    it('T02: AUTO efficiency formula calculates actual / theoretical * 100', () => {
      // Theoretical = 195.58, Actual = 150 -> (150 / 195.58) * 100 = 76.69%
      const efficiency = calculateEfficiency(150, 195.58);
      expect(efficiency).toBe(76.69);
    });

    it('T03: Night shift timing handles crossing midnight correctly', () => {
      const timings = getShiftTimings('2026-10-21', ShiftType.NIGHT);
      expect(timings.durationHours).toBe(13);
      expect(timings.timeRangeFormatted).toContain('07:00 PM – 08:00 AM');
      expect(timings.shiftEnd.getTime()).toBeGreaterThan(timings.shiftStart.getTime());
    });
  });

  // ─── Production Sheet Creation & Saving ──────────────────────────────────────
  describe('POST /api/v1/production-sheets - Creation & Saving', () => {
    it('T04: Saves Day-shift production sheet with AUTO efficiency calculation', async () => {
      const res = await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(adminA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.DAY,
          entries: [
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: 150,
              efficiencyMode: EfficiencyMode.AUTO,
            },
            {
              machineId: machine2._id.toString(),
              actualProductionMeters: 120,
              efficiencyMode: EfficiencyMode.AUTO,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shift).toBe('DAY');
      expect(res.body.data.shiftDurationHours).toBe(11);
      expect(res.body.data.entries).toHaveLength(2);

      const entry1 = res.body.data.entries.find((e: any) => e.machineNumberSnapshot === 'WJ-01');
      expect(entry1).toBeDefined();
      expect(entry1.actualProductionMeters).toBe(150);
      expect(entry1.theoreticalProductionMeters).toBe(195.58);
      expect(entry1.efficiencyPercent).toBe(76.69);
      expect(entry1.fabricNameSnapshot).toBe('NC CHIFFON');
      expect(entry1.rpmSnapshot).toBe(700);
      expect(entry1.ppiSnapshot).toBe(60);

      expect(res.body.data.totalProductionMeters).toBe(270);
      expect(res.body.data.runningMachineCount).toBe(1);
      expect(res.body.data.stoppedMachineCount).toBe(1);
    });

    it('T05: Saves Night-shift production sheet with MANUAL efficiency entry', async () => {
      const res = await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(operatorA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.NIGHT,
          entries: [
            {
              machineId: machine2._id.toString(),
              actualProductionMeters: 120,
              efficiencyMode: EfficiencyMode.MANUAL,
              efficiencyPercent: 80.5,
              notes: 'Manual entry due to belt slipping',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shift).toBe('NIGHT');
      expect(res.body.data.shiftDurationHours).toBe(13);

      const entry = res.body.data.entries[0];
      expect(entry.efficiencyMode).toBe(EfficiencyMode.MANUAL);
      expect(entry.efficiencyPercent).toBe(80.5);
      expect(entry.notes).toBe('Manual entry due to belt slipping');
    });

    it('T06: Rejects request with negative actual production meters', async () => {
      const res = await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(adminA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.DAY,
          entries: [
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: -50,
              efficiencyMode: EfficiencyMode.AUTO,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('T07: Rejects duplicate machine entries within the same sheet', async () => {
      const res = await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(adminA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.DAY,
          entries: [
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: 100,
              efficiencyMode: EfficiencyMode.AUTO,
            },
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: 120,
              efficiencyMode: EfficiencyMode.AUTO,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Duplicate machine entries');
    });

    it('T08: VIEWER role cannot create or save production sheets (403)', async () => {
      const res = await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(viewerA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.DAY,
          entries: [
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: 100,
              efficiencyMode: EfficiencyMode.AUTO,
            },
          ],
        });

      expect(res.status).toBe(403);
    });
  });

  // ─── Querying & By-Date Lookup ──────────────────────────────────────────────
  describe('GET /api/v1/production-sheets/by-date - Date & Shift Lookup', () => {
    it('T09: Retrieves existing saved production sheet by date and shift', async () => {
      // 1. Create a sheet
      await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(adminA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.DAY,
          entries: [
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: 140,
              efficiencyMode: EfficiencyMode.AUTO,
            },
          ],
        });

      // 2. Query it
      const res = await agent
        .get('/api/v1/production-sheets/by-date?date=2026-10-21&shift=DAY')
        .set('Cookie', getAuthCookie(viewerA));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toBeNull();
      expect(res.body.data.productionDate).toBe('2026-10-21');
      expect(res.body.data.shift).toBe('DAY');
      expect(res.body.data.entries[0].actualProductionMeters).toBe(140);
    });

    it('T10: Returns null when no sheet exists for date and shift', async () => {
      const res = await agent
        .get('/api/v1/production-sheets/by-date?date=2026-10-20&shift=NIGHT')
        .set('Cookie', getAuthCookie(viewerA));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  // ─── Sheet Completion & Reopening Lifecycle ─────────────────────────────────
  describe('Completion & Reopening Lifecycle', () => {
    it('T11: Completes and locks a production sheet', async () => {
      const saveRes = await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(adminA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.DAY,
          entries: [
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: 150,
              efficiencyMode: EfficiencyMode.AUTO,
            },
          ],
        });

      const sheetId = saveRes.body.data.id;

      const completeRes = await agent
        .post(`/api/v1/production-sheets/${sheetId}/complete`)
        .set('Cookie', getAuthCookie(operatorA));

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe(ProductionSheetStatus.COMPLETED);
      expect(completeRes.body.data.completedAt).toBeDefined();
    });

    it('T12: Admin can reopen a completed sheet, but Operator cannot (403)', async () => {
      // Save and complete
      const saveRes = await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(adminA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.DAY,
          status: ProductionSheetStatus.COMPLETED,
          entries: [
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: 150,
              efficiencyMode: EfficiencyMode.AUTO,
            },
          ],
        });

      const sheetId = saveRes.body.data.id;

      // Operator cannot reopen
      const opReopen = await agent
        .post(`/api/v1/production-sheets/${sheetId}/reopen`)
        .set('Cookie', getAuthCookie(operatorA));
      expect(opReopen.status).toBe(403);

      // Admin can reopen
      const adminReopen = await agent
        .post(`/api/v1/production-sheets/${sheetId}/reopen`)
        .set('Cookie', getAuthCookie(adminA));
      expect(adminReopen.status).toBe(200);
      expect(adminReopen.body.data.status).toBe(ProductionSheetStatus.DRAFT);
    });
  });

  // ─── Multi-Tenancy & Factory Isolation ──────────────────────────────────────
  describe('Multi-Tenancy & Factory Isolation', () => {
    it('T13: Factory B user cannot access Factory A production sheet (404)', async () => {
      const saveRes = await agent
        .post('/api/v1/production-sheets')
        .set('Cookie', getAuthCookie(adminA))
        .send({
          productionDate: '2026-10-21',
          shift: ShiftType.DAY,
          entries: [
            {
              machineId: machine1._id.toString(),
              actualProductionMeters: 150,
              efficiencyMode: EfficiencyMode.AUTO,
            },
          ],
        });

      const sheetId = saveRes.body.data.id;

      // Factory B tries to read
      const getRes = await agent
        .get(`/api/v1/production-sheets/${sheetId}`)
        .set('Cookie', getAuthCookie(adminB));

      expect(getRes.status).toBe(404);

      // Factory B tries by-date
      const byDateRes = await agent
        .get('/api/v1/production-sheets/by-date?date=2026-10-21&shift=DAY')
        .set('Cookie', getAuthCookie(adminB));

      expect(byDateRes.body.data).toBeNull();
    });
  });
});
