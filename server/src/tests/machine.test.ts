import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { User, UserRole, IUser } from '../modules/user/user.model';
import { Factory, IFactory } from '../modules/factory/factory.model';
import { Yarn, YarnType } from '../modules/yarn/yarn.model';
import { Fabric, IFabric, normalizeFabricCode, normalizeFabricName } from '../modules/fabric/fabric.model';
import { Beam, IBeam, BeamStatus, normalizeBeamNumber } from '../modules/beam/beam.model';
import { Machine, IMachine, MachineStatus } from '../modules/machine/machine.model';
import { BeamLoadingHistory } from '../modules/beam/beam-history.model';
import { signAccessToken } from '../utils/jwt';

const app = createApp();
const agent = request(app);

let counter = 0;

// ─── Test Helpers ─────────────────────────────────────────────────────────────
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
  name = 'Cotton Chiffon 60s',
  code = 'CC-60',
  isActive = true,
): Promise<IFabric> {
  counter++;
  const yarn = await Yarn.create({
    name: `Warp Yarn ${counter}`,
    denier: 60 + counter,
    yarnType: YarnType.WARP,
    rate: 200,
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
    warpYarnId: yarn._id,
    weftYarnId: yarn._id,
    ppi: 68,
    panno: 44.5,
    wastagePercent: 2,
    recommendedRpm: 750,
    factoryId,
    isActive,
    createdBy: userId,
    updatedBy: userId,
  });
}

async function createBeamHelper(
  factoryId: Types.ObjectId,
  fabricId: Types.ObjectId,
  userId: Types.ObjectId,
  beamNumber = 'B-101',
  status = BeamStatus.IN_GODOWN,
  remainingLengthMeters = 8000,
): Promise<IBeam> {
  counter++;
  const yarn = await Yarn.create({
    name: `Beam Yarn ${counter}`,
    denier: 75 + counter,
    yarnType: YarnType.WARP,
    rate: 180,
    rateUnit: 'KG',
    factoryId,
    isActive: true,
    createdBy: userId,
    updatedBy: userId,
  });

  const originalLength = Math.max(10000, remainingLengthMeters);

  return Beam.create({
    beamNumber,
    normalizedBeamNumber: normalizeBeamNumber(beamNumber),
    pipeNumber: 'P-01',
    factoryId,
    fabricId,
    warpYarnId: yarn._id,
    originalLengthMeters: originalLength,
    remainingLengthMeters,
    ends: 5200,
    widthInches: 60,
    status,
    alertAtMeters: 500,
    isActive: true,
    createdBy: userId,
    updatedBy: userId,
  });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('Machine Management Module (/api/v1/machines)', () => {
  let factoryA: IFactory;
  let factoryB: IFactory;
  let adminA: IUser;
  let operatorA: IUser;
  let viewerA: IUser;
  let adminB: IUser;
  let cookieA: string;
  let cookieOperatorA: string;
  let cookieViewerA: string;
  let cookieB: string;
  let fabricA: IFabric;

  beforeEach(async () => {
    await Machine.deleteMany({});
    await Beam.deleteMany({});
    await BeamLoadingHistory.deleteMany({});
    await Fabric.deleteMany({});
    await Yarn.deleteMany({});
    await User.deleteMany({});
    await Factory.deleteMany({});

    factoryA = await createFactory('Factory Alpha', 'FA');
    factoryB = await createFactory('Factory Beta', 'FB');

    adminA = await createUser('admin.a@sbkt.com', UserRole.FACTORY_ADMIN, factoryA._id);
    operatorA = await createUser('operator.a@sbkt.com', UserRole.OPERATOR, factoryA._id);
    viewerA = await createUser('viewer.a@sbkt.com', UserRole.VIEWER, factoryA._id);
    adminB = await createUser('admin.b@sbkt.com', UserRole.FACTORY_ADMIN, factoryB._id);

    cookieA = getAuthCookie(adminA);
    cookieOperatorA = getAuthCookie(operatorA);
    cookieViewerA = getAuthCookie(viewerA);
    cookieB = getAuthCookie(adminB);

    fabricA = await createFabricHelper(factoryA._id, adminA._id, 'Chiffon', 'CHF-01');
  });

  // ─── 1. Creation & Validation ───────────────────────────────────────────────
  describe('POST /api/v1/machines - Creation & Validation', () => {
    it('T01: Authorized FACTORY_ADMIN can create a new machine', async () => {
      const res = await agent
        .post('/api/v1/machines')
        .set('Cookie', cookieA)
        .send({
          machineNumber: 'WJ-01',
          name: 'Waterjet Loom 01',
          fabricId: fabricA._id.toString(),
          rpm: 700,
          ppi: 68,
          status: 'STOPPED',
          notes: 'Initial test loom',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.machineNumber).toBe('WJ-01');
      expect(res.body.data.name).toBe('Waterjet Loom 01');
      expect(res.body.data.status).toBe('STOPPED');
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.factoryId).toBe(factoryA._id.toString());
      expect(res.body.data.fabric).toBeDefined();
      expect(res.body.data.fabric.code).toBe('CHF-01');
    });

    it('T02: Rejects unauthenticated request with 401', async () => {
      const res = await agent.post('/api/v1/machines').send({
        machineNumber: 'WJ-01',
        name: 'Loom 01',
        fabricId: fabricA._id.toString(),
        rpm: 700,
        ppi: 68,
      });

      expect(res.status).toBe(401);
    });

    it('T03: Rejects VIEWER role creation with 403', async () => {
      const res = await agent
        .post('/api/v1/machines')
        .set('Cookie', cookieViewerA)
        .send({
          machineNumber: 'WJ-02',
          name: 'Loom 02',
          fabricId: fabricA._id.toString(),
          rpm: 700,
          ppi: 68,
        });

      expect(res.status).toBe(403);
    });

    it('T04: Rejects duplicate machineNumber within the same factory with 409', async () => {
      await agent
        .post('/api/v1/machines')
        .set('Cookie', cookieA)
        .send({
          machineNumber: 'WJ-01',
          name: 'Waterjet Loom 01',
          fabricId: fabricA._id.toString(),
          rpm: 700,
          ppi: 68,
        });

      const dupRes = await agent
        .post('/api/v1/machines')
        .set('Cookie', cookieA)
        .send({
          machineNumber: 'wj-01', // Lowercase test
          name: 'Waterjet Loom Duplicate',
          fabricId: fabricA._id.toString(),
          rpm: 720,
          ppi: 70,
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.message).toMatch(/already exists/i);
    });

    it('T05: Rejects invalid or negative RPM and PPI with 400', async () => {
      const resInvalidRpm = await agent
        .post('/api/v1/machines')
        .set('Cookie', cookieA)
        .send({
          machineNumber: 'WJ-03',
          name: 'Loom 03',
          fabricId: fabricA._id.toString(),
          rpm: -100,
          ppi: 68,
        });
      expect(resInvalidRpm.status).toBe(400);

      const resInvalidPpi = await agent
        .post('/api/v1/machines')
        .set('Cookie', cookieA)
        .send({
          machineNumber: 'WJ-03',
          name: 'Loom 03',
          fabricId: fabricA._id.toString(),
          rpm: 700,
          ppi: 0,
        });
      expect(resInvalidPpi.status).toBe(400);
    });

    it('T06: Rejects cross-factory fabric reference with 404', async () => {
      const fabricB = await createFabricHelper(factoryB._id, adminB._id, 'Beta Fabric', 'BF-01');

      const res = await agent
        .post('/api/v1/machines')
        .set('Cookie', cookieA)
        .send({
          machineNumber: 'WJ-04',
          name: 'Loom 04',
          fabricId: fabricB._id.toString(), // Belongs to Factory B
          rpm: 700,
          ppi: 68,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/fabric.*does not exist.*another factory/i);
    });
  });

  // ─── 2. Listing, Search & Filters ──────────────────────────────────────────
  describe('GET /api/v1/machines - Listing & Filtering', () => {
    beforeEach(async () => {
      const fabric2 = await createFabricHelper(factoryA._id, adminA._id, 'Satin Silk', 'STN-02');

      await Machine.create([
        {
          machineNumber: 'WJ-01',
          normalizedMachineNumber: 'WJ-01',
          name: 'Waterjet Alpha',
          factoryId: factoryA._id,
          fabricId: fabricA._id,
          rpm: 700,
          ppi: 68,
          status: MachineStatus.RUNNING,
          isActive: true,
          createdBy: adminA._id,
          updatedBy: adminA._id,
        },
        {
          machineNumber: 'WJ-02',
          normalizedMachineNumber: 'WJ-02',
          name: 'Waterjet Beta',
          factoryId: factoryA._id,
          fabricId: fabric2._id,
          rpm: 750,
          ppi: 72,
          status: MachineStatus.STOPPED,
          isActive: true,
          createdBy: adminA._id,
          updatedBy: adminA._id,
        },
        {
          machineNumber: 'WJ-03',
          normalizedMachineNumber: 'WJ-03',
          name: 'Rapier Gamma',
          factoryId: factoryA._id,
          fabricId: fabricA._id,
          rpm: 600,
          ppi: 60,
          status: MachineStatus.MAINTENANCE,
          isActive: false,
          createdBy: adminA._id,
          updatedBy: adminA._id,
        },
      ]);
    });

    it('T07: Returns paginated list of machines for current factory', async () => {
      const res = await agent
        .get('/api/v1/machines?page=1&limit=10')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.data.machines.length).toBe(3);
      expect(res.body.data.pagination.totalItems).toBe(3);
    });

    it('T08: Status filter returns only matching status machines', async () => {
      const res = await agent
        .get('/api/v1/machines?status=RUNNING')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.data.machines.length).toBe(1);
      expect(res.body.data.machines[0].machineNumber).toBe('WJ-01');
    });

    it('T09: Search works across machineNumber and name', async () => {
      const res = await agent
        .get('/api/v1/machines?search=Rapier')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.data.machines.length).toBe(1);
      expect(res.body.data.machines[0].machineNumber).toBe('WJ-03');
    });

    it('T10: Operator only sees active machines by default', async () => {
      const res = await agent
        .get('/api/v1/machines')
        .set('Cookie', cookieOperatorA);

      expect(res.status).toBe(200);
      expect(res.body.data.machines.length).toBe(2); // WJ-03 is inactive
      const numbers = res.body.data.machines.map((m: { machineNumber: string }) => m.machineNumber);
      expect(numbers).not.toContain('WJ-03');
    });
  });

  // ─── 3. Detail, Edit, Status & Soft Toggle ──────────────────────────────────
  describe('Machine CRUD Details, Status & Active Toggle', () => {
    let machineId: string;

    beforeEach(async () => {
      const m = await Machine.create({
        machineNumber: 'WJ-10',
        normalizedMachineNumber: 'WJ-10',
        name: 'Loom 10',
        factoryId: factoryA._id,
        fabricId: fabricA._id,
        rpm: 680,
        ppi: 64,
        status: MachineStatus.STOPPED,
        isActive: true,
        createdBy: adminA._id,
        updatedBy: adminA._id,
      });
      machineId = m._id.toString();
    });

    it('T11: Get machine details returns populated fabric info', async () => {
      const res = await agent
        .get(`/api/v1/machines/${machineId}`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(machineId);
      expect(res.body.data.fabric).toBeDefined();
      expect(res.body.data.fabric.name).toBe('Chiffon');
    });

    it('T12: Update machine modifies RPM, PPI, and notes', async () => {
      const res = await agent
        .patch(`/api/v1/machines/${machineId}`)
        .set('Cookie', cookieA)
        .send({
          rpm: 720,
          ppi: 66,
          notes: 'Updated calibration',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rpm).toBe(720);
      expect(res.body.data.ppi).toBe(66);
      expect(res.body.data.notes).toBe('Updated calibration');
    });

    it('T13: Update machine status updates operational state', async () => {
      const res = await agent
        .patch(`/api/v1/machines/${machineId}/status`)
        .set('Cookie', cookieA)
        .send({
          status: 'MAINTENANCE',
          notes: 'Scheduled monthly oiling',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('MAINTENANCE');
    });

    it('T14: Soft toggle switches isActive status', async () => {
      const resDeactivate = await agent
        .patch(`/api/v1/machines/${machineId}/active`)
        .set('Cookie', cookieA);

      expect(resDeactivate.status).toBe(200);
      expect(resDeactivate.body.data.isActive).toBe(false);

      const resActivate = await agent
        .patch(`/api/v1/machines/${machineId}/active`)
        .set('Cookie', cookieA);

      expect(resActivate.status).toBe(200);
      expect(resActivate.body.data.isActive).toBe(true);
    });

    it('T15: Factory B cannot access or modify Factory A machine (404)', async () => {
      const getRes = await agent
        .get(`/api/v1/machines/${machineId}`)
        .set('Cookie', cookieB);
      expect(getRes.status).toBe(404);

      const patchRes = await agent
        .patch(`/api/v1/machines/${machineId}`)
        .set('Cookie', cookieB)
        .send({ rpm: 900 });
      expect(patchRes.status).toBe(404);
    });
  });

  // ─── 4. Batch Edit ─────────────────────────────────────────────────────────
  describe('PATCH /api/v1/machines/batch - Batch Editing', () => {
    let m1Id: string;
    let m2Id: string;
    let m3Id: string;

    beforeEach(async () => {
      const m1 = await Machine.create({
        machineNumber: 'WJ-21',
        normalizedMachineNumber: 'WJ-21',
        name: 'Loom 21',
        factoryId: factoryA._id,
        fabricId: fabricA._id,
        rpm: 650,
        ppi: 60,
        status: MachineStatus.STOPPED,
        isActive: true,
        createdBy: adminA._id,
        updatedBy: adminA._id,
      });
      const m2 = await Machine.create({
        machineNumber: 'WJ-22',
        normalizedMachineNumber: 'WJ-22',
        name: 'Loom 22',
        factoryId: factoryA._id,
        fabricId: fabricA._id,
        rpm: 650,
        ppi: 60,
        status: MachineStatus.STOPPED,
        isActive: true,
        createdBy: adminA._id,
        updatedBy: adminA._id,
      });
      const m3 = await Machine.create({
        machineNumber: 'WJ-23',
        normalizedMachineNumber: 'WJ-23',
        name: 'Loom 23',
        factoryId: factoryA._id,
        fabricId: fabricA._id,
        rpm: 650,
        ppi: 60,
        status: MachineStatus.STOPPED,
        isActive: false, // Inactive
        createdBy: adminA._id,
        updatedBy: adminA._id,
      });

      m1Id = m1._id.toString();
      m2Id = m2._id.toString();
      m3Id = m3._id.toString();
    });

    it('T16: Batch edit updates only selected fields for multiple machines', async () => {
      const res = await agent
        .patch('/api/v1/machines/batch')
        .set('Cookie', cookieA)
        .send({
          machineIds: [m1Id, m2Id],
          updates: {
            ppi: 68,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(2);
      expect(res.body.data.failedCount).toBe(0);

      // Verify m1 updated PPI but kept RPM
      const checkM1 = await Machine.findById(m1Id);
      expect(checkM1?.ppi).toBe(68);
      expect(checkM1?.rpm).toBe(650);

      const checkM2 = await Machine.findById(m2Id);
      expect(checkM2?.ppi).toBe(68);
      expect(checkM2?.rpm).toBe(650);
    });

    it('T17: Batch edit reports partial failures if an inactive or unknown machine is passed', async () => {
      const fakeId = new Types.ObjectId().toString();

      const res = await agent
        .patch('/api/v1/machines/batch')
        .set('Cookie', cookieA)
        .send({
          machineIds: [m1Id, m3Id, fakeId],
          updates: {
            rpm: 710,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(1); // Only m1 succeeded
      expect(res.body.data.failedCount).toBe(2); // m3 (inactive) and fakeId failed
      expect(res.body.data.errors.length).toBe(2);
    });
  });

  // ─── 5. Beam Loading and Unloading Integration ─────────────────────────────
  describe('Beam Loading & Unloading Integration', () => {
    let machine: IMachine;
    let beam: IBeam;

    beforeEach(async () => {
      machine = await Machine.create({
        machineNumber: 'WJ-30',
        normalizedMachineNumber: 'WJ-30',
        name: 'Loom 30',
        factoryId: factoryA._id,
        fabricId: fabricA._id,
        rpm: 700,
        ppi: 68,
        status: MachineStatus.STOPPED,
        isActive: true,
        createdBy: adminA._id,
        updatedBy: adminA._id,
      });

      beam = await createBeamHelper(factoryA._id, fabricA._id, adminA._id, 'B-300', BeamStatus.IN_GODOWN, 9000);
    });

    it('T18: Load beam updates machine.loadedBeamId, beam.status = LOADED, and records history', async () => {
      const res = await agent
        .post(`/api/v1/machines/${machine._id}/load-beam`)
        .set('Cookie', cookieA)
        .send({
          beamId: beam._id.toString(),
          notes: 'Loaded for shift A',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.loadedBeamId).toBe(beam._id.toString());
      expect(res.body.data.loadedBeam.beamNumber).toBe('B-300');

      // Check Beam record
      const updatedBeam = await Beam.findById(beam._id);
      expect(updatedBeam?.status).toBe(BeamStatus.LOADED);
      expect(updatedBeam?.loadedMachineNumber).toBe('WJ-30');
      expect(updatedBeam?.loadedMachineId?.toString()).toBe(machine._id.toString());

      // Check History
      const history = await BeamLoadingHistory.findOne({
        beamId: beam._id,
        machineNumber: 'WJ-30',
      });
      expect(history).toBeDefined();
      expect(history?.startingMeters).toBe(9000);
      expect(history?.status).toBe(BeamStatus.LOADED);
    });

    it('T19: Rejects loading beam if machine is under MAINTENANCE with 400', async () => {
      machine.status = MachineStatus.MAINTENANCE;
      await machine.save();

      const res = await agent
        .post(`/api/v1/machines/${machine._id}/load-beam`)
        .set('Cookie', cookieA)
        .send({
          beamId: beam._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/maintenance/i);
    });

    it('T20: Rejects loading if machine already has a beam loaded with 409', async () => {
      // Load beam 1
      await agent
        .post(`/api/v1/machines/${machine._id}/load-beam`)
        .set('Cookie', cookieA)
        .send({ beamId: beam._id.toString() });

      // Create beam 2
      const beam2 = await createBeamHelper(factoryA._id, fabricA._id, adminA._id, 'B-301');

      // Attempt to load beam 2 onto same machine
      const res = await agent
        .post(`/api/v1/machines/${machine._id}/load-beam`)
        .set('Cookie', cookieA)
        .send({ beamId: beam2._id.toString() });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already has a beam loaded/i);
    });

    it('T21: Unload beam clears loadedBeamId, updates remaining meters, and sets outcome status', async () => {
      // First load
      await agent
        .post(`/api/v1/machines/${machine._id}/load-beam`)
        .set('Cookie', cookieA)
        .send({ beamId: beam._id.toString() });

      // Now unload
      const res = await agent
        .post(`/api/v1/machines/${machine._id}/unload-beam`)
        .set('Cookie', cookieA)
        .send({
          endingMeters: 4500,
          outcomeStatus: 'FINISHED',
          notes: 'Doffed completely',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.loadedBeamId).toBeUndefined();

      // Check Beam record
      const updatedBeam = await Beam.findById(beam._id);
      expect(updatedBeam?.status).toBe(BeamStatus.FINISHED);
      expect(updatedBeam?.remainingLengthMeters).toBe(4500);
      expect(updatedBeam?.loadedMachineId).toBeUndefined();

      // Check History
      const unloadHistory = await BeamLoadingHistory.findOne({
        beamId: beam._id,
        unloadedAt: { $exists: true },
      });
      expect(unloadHistory).toBeDefined();
      expect(unloadHistory?.endingMeters).toBe(4500);
      expect(unloadHistory?.usedMeters).toBe(4500); // 9000 - 4500
      expect(unloadHistory?.status).toBe(BeamStatus.FINISHED);
    });

    it('T22: Prevent deactivating a machine while a beam is currently loaded', async () => {
      // Load beam
      await agent
        .post(`/api/v1/machines/${machine._id}/load-beam`)
        .set('Cookie', cookieA)
        .send({ beamId: beam._id.toString() });

      // Attempt deactivation
      const res = await agent
        .patch(`/api/v1/machines/${machine._id}/active`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot deactivate machine.*while a beam is loaded/i);
    });
  });
});
