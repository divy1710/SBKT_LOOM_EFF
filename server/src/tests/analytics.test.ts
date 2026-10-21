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
import { normalizeProductionDate } from '../modules/production/production.utils';
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

describe('Production Analytics & Efficiency Analysis (/api/v1/analytics)', () => {
  let factoryA: IFactory;
  let factoryB: IFactory;
  let adminA: IUser;
  let adminB: IUser;
  let fabric1: IFabric;
  let fabric2: IFabric;
  let machine1: IMachine;
  let machine2: IMachine;
  let machine3: IMachine;

  beforeEach(async () => {
    counter++;
    factoryA = await createFactory(`Factory A Analytics ${counter}`, `FAA${counter}`);
    factoryB = await createFactory(`Factory B Analytics ${counter}`, `FAB${counter}`);

    adminA = await createUser(`adminA_an_${counter}@example.com`, UserRole.FACTORY_ADMIN, factoryA._id);
    adminB = await createUser(`adminB_an_${counter}@example.com`, UserRole.FACTORY_ADMIN, factoryB._id);

    fabric1 = await createFabricHelper(factoryA._id, adminA._id, 'NC CHIFFON', `NC-CH-${counter}`);
    fabric2 = await createFabricHelper(factoryA._id, adminA._id, 'NC SATIN', `NC-SAT-${counter}`);

    machine1 = await createMachineHelper(factoryA._id, fabric1._id, adminA._id, 'WJ-01', 700, 60, MachineStatus.RUNNING);
    machine2 = await createMachineHelper(factoryA._id, fabric2._id, adminA._id, 'WJ-02', 650, 60, MachineStatus.RUNNING);
    machine3 = await createMachineHelper(factoryA._id, fabric1._id, adminA._id, 'WJ-03', 600, 60, MachineStatus.STOPPED);

    // Seed historical production sheets for Factory A:
    // Date: 2026-10-20 (Day shift)
    await ProductionSheet.create({
      factoryId: factoryA._id,
      productionDate: normalizeProductionDate('2026-10-20'),
      shift: ShiftType.DAY,
      shiftStart: new Date('2026-10-20T02:30:00.000Z'),
      shiftEnd: new Date('2026-10-20T13:30:00.000Z'),
      shiftDurationHours: 11,
      totalProductionMeters: 350,
      runningMachineCount: 2,
      stoppedMachineCount: 1,
      maintenanceMachineCount: 0,
      averageEfficiency: 82.5,
      status: ProductionSheetStatus.COMPLETED,
      createdBy: adminA._id,
      updatedBy: adminA._id,
      entries: [
        {
          machineId: machine1._id,
          machineNumberSnapshot: 'WJ-01',
          fabricId: fabric1._id,
          fabricNameSnapshot: 'NC CHIFFON',
          fabricCodeSnapshot: fabric1.code,
          shift: ShiftType.DAY,
          productionDate: normalizeProductionDate('2026-10-20'),
          actualProductionMeters: 200,
          efficiencyMode: EfficiencyMode.AUTO,
          efficiencyPercent: 88.2,
          rpmSnapshot: 700,
          ppiSnapshot: 60,
          shiftDurationHours: 11,
          theoreticalProductionMeters: 195.58,
          machineStatusSnapshot: ProductionMachineStatus.RUNNING,
        },
        {
          machineId: machine2._id,
          machineNumberSnapshot: 'WJ-02',
          fabricId: fabric2._id,
          fabricNameSnapshot: 'NC SATIN',
          fabricCodeSnapshot: fabric2.code,
          shift: ShiftType.DAY,
          productionDate: normalizeProductionDate('2026-10-20'),
          actualProductionMeters: 150,
          efficiencyMode: EfficiencyMode.MANUAL,
          efficiencyPercent: 76.8,
          rpmSnapshot: 650,
          ppiSnapshot: 60,
          shiftDurationHours: 11,
          theoreticalProductionMeters: 181.61,
          machineStatusSnapshot: ProductionMachineStatus.RUNNING,
        },
      ],
    });

    // Date: 2026-10-21 (Day shift)
    await ProductionSheet.create({
      factoryId: factoryA._id,
      productionDate: normalizeProductionDate('2026-10-21'),
      shift: ShiftType.DAY,
      shiftStart: new Date('2026-10-21T02:30:00.000Z'),
      shiftEnd: new Date('2026-10-21T13:30:00.000Z'),
      shiftDurationHours: 11,
      totalProductionMeters: 400,
      runningMachineCount: 2,
      stoppedMachineCount: 1,
      maintenanceMachineCount: 0,
      averageEfficiency: 85.0,
      status: ProductionSheetStatus.COMPLETED,
      createdBy: adminA._id,
      updatedBy: adminA._id,
      entries: [
        {
          machineId: machine1._id,
          machineNumberSnapshot: 'WJ-01',
          fabricId: fabric1._id,
          fabricNameSnapshot: 'NC CHIFFON',
          fabricCodeSnapshot: fabric1.code,
          shift: ShiftType.DAY,
          productionDate: normalizeProductionDate('2026-10-21'),
          actualProductionMeters: 220,
          efficiencyMode: EfficiencyMode.AUTO,
          efficiencyPercent: 92.4,
          rpmSnapshot: 700,
          ppiSnapshot: 60,
          shiftDurationHours: 11,
          theoreticalProductionMeters: 195.58,
          machineStatusSnapshot: ProductionMachineStatus.RUNNING,
        },
        {
          machineId: machine2._id,
          machineNumberSnapshot: 'WJ-02',
          fabricId: fabric2._id,
          fabricNameSnapshot: 'NC SATIN',
          fabricCodeSnapshot: fabric2.code,
          shift: ShiftType.DAY,
          productionDate: normalizeProductionDate('2026-10-21'),
          actualProductionMeters: 180,
          efficiencyMode: EfficiencyMode.AUTO,
          efficiencyPercent: 77.6,
          rpmSnapshot: 650,
          ppiSnapshot: 60,
          shiftDurationHours: 11,
          theoreticalProductionMeters: 181.61,
          machineStatusSnapshot: ProductionMachineStatus.RUNNING,
        },
      ],
    });

    // Date: 2026-10-21 (Night shift)
    await ProductionSheet.create({
      factoryId: factoryA._id,
      productionDate: normalizeProductionDate('2026-10-21'),
      shift: ShiftType.NIGHT,
      shiftStart: new Date('2026-10-21T13:30:00.000Z'),
      shiftEnd: new Date('2026-10-22T02:30:00.000Z'),
      shiftDurationHours: 13,
      totalProductionMeters: 260,
      runningMachineCount: 1,
      stoppedMachineCount: 2,
      maintenanceMachineCount: 0,
      averageEfficiency: 89.0,
      status: ProductionSheetStatus.COMPLETED,
      createdBy: adminA._id,
      updatedBy: adminA._id,
      entries: [
        {
          machineId: machine1._id,
          machineNumberSnapshot: 'WJ-01',
          fabricId: fabric1._id,
          fabricNameSnapshot: 'NC CHIFFON',
          fabricCodeSnapshot: fabric1.code,
          shift: ShiftType.NIGHT,
          productionDate: normalizeProductionDate('2026-10-21'),
          actualProductionMeters: 260,
          efficiencyMode: EfficiencyMode.AUTO,
          efficiencyPercent: 89.0,
          rpmSnapshot: 700,
          ppiSnapshot: 60,
          shiftDurationHours: 13,
          theoreticalProductionMeters: 231.14,
          machineStatusSnapshot: ProductionMachineStatus.RUNNING,
        },
      ],
    });
  });

  // ─── 1. Production Summary & Smart Insights ─────────────────────────────────
  describe('GET /api/v1/analytics/production-summary', () => {
    it('T01: Returns correct production totals, metrics and smart insights', async () => {
      const res = await agent
        .get('/api/v1/analytics/production-summary?startDate=2026-10-20&endDate=2026-10-21&shift=ALL')
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Period production: 350 (Oct 20) + 400 (Oct 21 Day) + 260 (Oct 21 Night) = 1010 meters
      expect(res.body.data.periodProduction).toBe(1010);
      expect(res.body.data.distinctDaysCount).toBe(2);
      expect(res.body.data.avgDailyProduction).toBe(505);

      // Best day: Oct 21 (400 + 260 = 660m)
      expect(res.body.data.bestDay.date).toBe('2026-10-21');
      expect(res.body.data.bestDay.meters).toBe(660);

      // Best machine: WJ-01 (200 + 220 + 260 = 680m)
      expect(res.body.data.bestMachine.machineNumber).toBe('WJ-01');
      expect(res.body.data.bestMachine.meters).toBe(680);

      // Smart insights
      expect(res.body.data.insights).toBeInstanceOf(Array);
      expect(res.body.data.insights.length).toBeGreaterThan(0);
    });

    it('T02: Filters production summary by Day shift only', async () => {
      const res = await agent
        .get('/api/v1/analytics/production-summary?startDate=2026-10-20&endDate=2026-10-21&shift=DAY')
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(200);
      // Day only: 350 + 400 = 750 meters
      expect(res.body.data.periodProduction).toBe(750);
    });

    it('T03: Rejects invalid date range with startDate after endDate', async () => {
      const res = await agent
        .get('/api/v1/analytics/production-summary?startDate=2026-10-25&endDate=2026-10-20&shift=ALL')
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 2. Production Trend Graph ──────────────────────────────────────────────
  describe('GET /api/v1/analytics/production-trend', () => {
    it('T04: Returns daily trend points with Day and Night breakdowns', async () => {
      const res = await agent
        .get('/api/v1/analytics/production-trend?startDate=2026-10-20&endDate=2026-10-21&shift=ALL')
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);

      const oct20 = res.body.data.find((d: any) => d.date === '2026-10-20');
      expect(oct20.dayMeters).toBe(350);
      expect(oct20.nightMeters).toBe(0);
      expect(oct20.totalMeters).toBe(350);

      const oct21 = res.body.data.find((d: any) => d.date === '2026-10-21');
      expect(oct21.dayMeters).toBe(400);
      expect(oct21.nightMeters).toBe(260);
      expect(oct21.totalMeters).toBe(660);
    });
  });

  // ─── 3. Machine Analytics ───────────────────────────────────────────────────
  describe('GET /api/v1/analytics/machine', () => {
    it('T05: Returns single machine analytics with current config and combined daily production', async () => {
      const res = await agent
        .get(`/api/v1/analytics/machine?machineId=${machine1._id}&startDate=2026-10-20&endDate=2026-10-21&shift=ALL`)
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(200);
      expect(res.body.data.currentConfig.machineNumber).toBe('WJ-01');
      expect(res.body.data.currentConfig.rpm).toBe(700);

      // Machine 1 meters: 200 (Oct 20) + 220 (Oct 21 Day) + 260 (Oct 21 Night) = 680 meters
      expect(res.body.data.totalProductionMeters).toBe(680);
      expect(res.body.data.distinctDaysCount).toBe(2);
      expect(res.body.data.avgDailyProduction).toBe(340);
      expect(res.body.data.avgCombinedDailyProduction).toBe(340);
      expect(res.body.data.bestDay.date).toBe('2026-10-21');
      expect(res.body.data.bestDay.meters).toBe(480); // 220 + 260 on Oct 21
    });
  });

  // ─── 4. Fabric Quality Analytics ────────────────────────────────────────────
  describe('GET /api/v1/analytics/fabric-quality', () => {
    it('T06: Returns production distribution and percentage share by fabric snapshot', async () => {
      const res = await agent
        .get('/api/v1/analytics/fabric-quality?startDate=2026-10-20&endDate=2026-10-21&shift=ALL')
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(200);
      expect(res.body.data.grandTotalProduction).toBe(1010);
      expect(res.body.data.fabrics).toHaveLength(2);

      // NC CHIFFON: 200 + 220 + 260 = 680m (67.3%)
      const chiffon = res.body.data.fabrics.find((f: any) => f.fabricName === 'NC CHIFFON');
      expect(chiffon.totalProductionMeters).toBe(680);
      expect(chiffon.percentageShare).toBe(67.3);
      expect(chiffon.entriesCount).toBe(3);

      // NC SATIN: 150 + 180 = 330m (32.7%)
      const satin = res.body.data.fabrics.find((f: any) => f.fabricName === 'NC SATIN');
      expect(satin.totalProductionMeters).toBe(330);
      expect(satin.percentageShare).toBe(32.7);
    });
  });

  // ─── 5. Machine Performance Analytics ───────────────────────────────────────
  describe('GET /api/v1/analytics/machine-performance', () => {
    it('T07: Returns top 5, bottom 5, and below-threshold machines', async () => {
      const res = await agent
        .get('/api/v1/analytics/machine-performance?startDate=2026-10-20&endDate=2026-10-21&shift=ALL&threshold=200')
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(200);
      // Top 1 is WJ-01 with 680m
      expect(res.body.data.top5[0].machineNumber).toBe('WJ-01');
      expect(res.body.data.top5[0].totalProductionMeters).toBe(680);

      // Total active machines is 3, recorded is 2, unrecorded is 1 (WJ-03)
      expect(res.body.data.totalActiveMachines).toBe(3);
      expect(res.body.data.recordedMachinesCount).toBe(2);
      expect(res.body.data.unrecordedMachinesCount).toBe(1);

      // WJ-02 avg per shift = 330 / 2 = 165m, which is below threshold 200m
      const below = res.body.data.belowThreshold;
      expect(below.some((m: any) => m.machineNumber === 'WJ-02')).toBe(true);
    });
  });

  // ─── 6. Efficiency Summary Analytics ───────────────────────────────────────
  describe('GET /api/v1/analytics/efficiency-summary', () => {
    it('T08: Calculates arithmetic mean of valid efficiency percentages', async () => {
      const res = await agent
        .get('/api/v1/analytics/efficiency-summary?startDate=2026-10-20&endDate=2026-10-21&shift=ALL')
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(200);
      expect(res.body.data.overallEntriesCount).toBe(5);
      // Valid efficiencies: 88.2, 76.8, 92.4, 77.6, 89.0 -> Sum: 424.0 / 5 = 84.8%
      expect(res.body.data.overallAvgEfficiency).toBe(84.8);
      expect(res.body.data.autoCount).toBe(4);
      expect(res.body.data.manualCount).toBe(1);
    });
  });

  // ─── 7. Machine Efficiency Ranking ──────────────────────────────────────────
  describe('GET /api/v1/analytics/efficiency-ranking', () => {
    it('T09: Ranks machines by average efficiency and flags below-threshold machines', async () => {
      const res = await agent
        .get('/api/v1/analytics/efficiency-ranking?startDate=2026-10-20&endDate=2026-10-21&shift=ALL&minEfficiencyThreshold=85')
        .set('Cookie', getAuthCookie(adminA));

      expect(res.status).toBe(200);
      expect(res.body.data.ranking).toHaveLength(2);

      // Rank 1: WJ-01 (avg = (88.2 + 92.4 + 89.0) / 3 = 89.87%)
      expect(res.body.data.ranking[0].machineNumber).toBe('WJ-01');
      expect(res.body.data.ranking[0].avgEfficiency).toBe(89.87);

      // Rank 2: WJ-02 (avg = (76.8 + 77.6) / 2 = 77.20%)
      expect(res.body.data.ranking[1].machineNumber).toBe('WJ-02');
      expect(res.body.data.ranking[1].avgEfficiency).toBe(77.2);

      // Below threshold (<85%): WJ-02
      expect(res.body.data.belowThreshold).toHaveLength(1);
      expect(res.body.data.belowThreshold[0].machineNumber).toBe('WJ-02');

      // Missing data: WJ-03
      expect(res.body.data.missingDataLoomsCount).toBe(1);
      expect(res.body.data.missingDataMachines[0].machineNumber).toBe('WJ-03');
    });
  });

  // ─── 8. Factory-Level Data Isolation ────────────────────────────────────────
  describe('Multi-Tenancy & Factory Isolation', () => {
    it('T10: Factory B user receives isolated analytics data with zero Factory A leakage', async () => {
      const res = await agent
        .get('/api/v1/analytics/production-summary?startDate=2026-10-20&endDate=2026-10-21&shift=ALL')
        .set('Cookie', getAuthCookie(adminB));

      expect(res.status).toBe(200);
      expect(res.body.data.periodProduction).toBe(0);
      expect(res.body.data.distinctDaysCount).toBe(0);
      expect(res.body.data.bestDay).toBeNull();
      expect(res.body.data.bestMachine).toBeNull();
    });
  });
});
