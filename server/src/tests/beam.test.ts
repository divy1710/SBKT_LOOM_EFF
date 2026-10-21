import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { User, UserRole, IUser } from '../modules/user/user.model';
import { Factory, IFactory } from '../modules/factory/factory.model';
import { Yarn, YarnType } from '../modules/yarn/yarn.model';
import { Fabric, IFabric, normalizeFabricCode, normalizeFabricName } from '../modules/fabric/fabric.model';
import { Beam, BeamStatus, normalizeBeamNumber } from '../modules/beam/beam.model';
import { signAccessToken } from '../utils/jwt';

const app = createApp();
const agent = request(app);

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

async function createYarnHelper(
  factoryId: Types.ObjectId,
  userId: Types.ObjectId,
  yarnType: YarnType = YarnType.WARP,
  name = 'Test Warp Yarn 75D',
  isActive = true,
) {
  return Yarn.create({
    name,
    denier: 75,
    yarnType,
    rate: 180,
    rateUnit: 'KG',
    factoryId,
    createdBy: userId,
    updatedBy: userId,
    isActive,
  });
}

async function createFabricHelper(
  factoryId: Types.ObjectId,
  userId: Types.ObjectId,
  warpYarnId: Types.ObjectId,
  weftYarnId: Types.ObjectId,
  code = 'FAB-TEST-01',
  isActive = true,
): Promise<IFabric> {
  return Fabric.create({
    name: `Fabric ${code}`,
    normalizedName: normalizeFabricName(`Fabric ${code}`),
    code,
    normalizedCode: normalizeFabricCode(code),
    warpYarnId,
    weftYarnId,
    ppi: 60,
    panno: 44.5,
    wastagePercent: 2.5,
    factoryId,
    createdBy: userId,
    updatedBy: userId,
    isActive,
  });
}

// ─── BEAM MASTER TESTS ─────────────────────────────────────────────────────────
describe('Beam Master Module (/api/v1/beams)', () => {
  let factoryA: IFactory;
  let factoryB: IFactory;

  let factoryAdminA: IUser;
  let factoryAdminB: IUser;
  let operatorA: IUser;
  let viewerA: IUser;

  let warpYarnA: any;
  let weftYarnA: any;
  let fabricA: IFabric;

  let warpYarnB: any;
  let weftYarnB: any;
  let fabricB: IFabric;

  beforeEach(async () => {
    factoryA = await createFactory('Beam Factory Alpha', 'BFA01');
    factoryB = await createFactory('Beam Factory Beta', 'BFB02');

    factoryAdminA = await createUser('beamadmin.a@sbkt.com', UserRole.FACTORY_ADMIN, factoryA._id);
    factoryAdminB = await createUser('beamadmin.b@sbkt.com', UserRole.FACTORY_ADMIN, factoryB._id);
    operatorA = await createUser('beamoperator.a@sbkt.com', UserRole.OPERATOR, factoryA._id);
    viewerA = await createUser('beamviewer.a@sbkt.com', UserRole.VIEWER, factoryA._id);

    warpYarnA = await createYarnHelper(factoryA._id, factoryAdminA._id, YarnType.WARP, 'Alpha Warp Yarn 75D');
    weftYarnA = await createYarnHelper(factoryA._id, factoryAdminA._id, YarnType.WEFT, 'Alpha Weft Yarn 150D');
    fabricA = await createFabricHelper(factoryA._id, factoryAdminA._id, warpYarnA._id, weftYarnA._id, 'FAB-ALPHA-01');

    warpYarnB = await createYarnHelper(factoryB._id, factoryAdminB._id, YarnType.WARP, 'Beta Warp Yarn 75D');
    weftYarnB = await createYarnHelper(factoryB._id, factoryAdminB._id, YarnType.WEFT, 'Beta Weft Yarn 150D');
    fabricB = await createFabricHelper(factoryB._id, factoryAdminB._id, warpYarnB._id, weftYarnB._id, 'FAB-BETA-01');
  });

  describe('POST /api/v1/beams - Creation & Validation', () => {
    it('T01: Authorized FACTORY_ADMIN can create a new beam with default remaining length', async () => {
      const res = await agent
        .post('/api/v1/beams')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({
          beamNumber: 'B001',
          pipeNumber: 'P-101',
          fabricId: fabricA._id.toString(),
          warpYarnId: warpYarnA._id.toString(),
          originalLengthMeters: 9300,
          ends: 5680,
          widthInches: 63,
          alertAtMeters: 500,
          notes: 'Test beam Alpha',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.beamNumber).toBe('B001');
      expect(res.body.data.pipeNumber).toBe('P-101');
      expect(res.body.data.originalLengthMeters).toBe(9300);
      expect(res.body.data.remainingLengthMeters).toBe(9300);
      expect(res.body.data.usedLengthMeters).toBe(0);
      expect(res.body.data.isLowMeters).toBe(false);
      expect(res.body.data.status).toBe(BeamStatus.IN_GODOWN);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.factoryId).toBe(factoryA._id.toString());
      expect(res.body.data.fabric).toBeDefined();
      expect(res.body.data.warpYarn).toBeDefined();
    });

    it('T02: Rejects unauthenticated request with 401', async () => {
      const res = await agent.post('/api/v1/beams').send({
        beamNumber: 'B002',
        fabricId: fabricA._id.toString(),
        warpYarnId: warpYarnA._id.toString(),
        originalLengthMeters: 8000,
        ends: 4000,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('T03: Rejects VIEWER role creation with 403', async () => {
      const res = await agent
        .post('/api/v1/beams')
        .set('Cookie', getAuthCookie(viewerA))
        .send({
          beamNumber: 'B-VIEWER',
          fabricId: fabricA._id.toString(),
          warpYarnId: warpYarnA._id.toString(),
          originalLengthMeters: 8000,
          ends: 4000,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('T04: Rejects duplicate beamNumber within same factory with 409', async () => {
      const payload = {
        beamNumber: 'B-DUP-01',
        fabricId: fabricA._id.toString(),
        warpYarnId: warpYarnA._id.toString(),
        originalLengthMeters: 9000,
        ends: 5000,
      };

      const res1 = await agent
        .post('/api/v1/beams')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send(payload);
      expect(res1.status).toBe(201);

      const res2 = await agent
        .post('/api/v1/beams')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send(payload);
      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
    });

    it('T05: Rejects negative or zero original length with 400', async () => {
      const res = await agent
        .post('/api/v1/beams')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({
          beamNumber: 'B-INV-LEN',
          fabricId: fabricA._id.toString(),
          warpYarnId: warpYarnA._id.toString(),
          originalLengthMeters: -100, // Invalid negative
          ends: 5000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('T06: Rejects remainingLengthMeters greater than originalLengthMeters with 400', async () => {
      const res = await agent
        .post('/api/v1/beams')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({
          beamNumber: 'B-EXCEED',
          fabricId: fabricA._id.toString(),
          warpYarnId: warpYarnA._id.toString(),
          originalLengthMeters: 5000,
          remainingLengthMeters: 6000, // Invalid: exceeds original
          ends: 5000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('T07: Rejects cross-factory fabric reference with 404', async () => {
      const res = await agent
        .post('/api/v1/beams')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({
          beamNumber: 'B-CROSS-FAB',
          fabricId: fabricB._id.toString(), // Belongs to Factory B!
          warpYarnId: warpYarnA._id.toString(),
          originalLengthMeters: 5000,
          ends: 5000,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('T08: Rejects cross-factory yarn reference with 404', async () => {
      const res = await agent
        .post('/api/v1/beams')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({
          beamNumber: 'B-CROSS-YARN',
          fabricId: fabricA._id.toString(),
          warpYarnId: warpYarnB._id.toString(), // Belongs to Factory B!
          originalLengthMeters: 5000,
          ends: 5000,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/beams - Listing, Filtering & Low-Meter Alert', () => {
    beforeEach(async () => {
      await Beam.create([
        {
          beamNumber: 'BM-101',
          normalizedBeamNumber: normalizeBeamNumber('BM-101'),
          pipeNumber: 'P-11',
          factoryId: factoryA._id,
          fabricId: fabricA._id,
          warpYarnId: warpYarnA._id,
          originalLengthMeters: 9000,
          remainingLengthMeters: 2500, // Normal meters
          alertAtMeters: 500,
          ends: 5000,
          status: BeamStatus.IN_GODOWN,
          isActive: true,
          createdBy: factoryAdminA._id,
          updatedBy: factoryAdminA._id,
        },
        {
          beamNumber: 'BM-102',
          normalizedBeamNumber: normalizeBeamNumber('BM-102'),
          pipeNumber: 'P-12',
          factoryId: factoryA._id,
          fabricId: fabricA._id,
          warpYarnId: warpYarnA._id,
          originalLengthMeters: 9000,
          remainingLengthMeters: 350, // Low meters! (<= 500)
          alertAtMeters: 500,
          ends: 5000,
          status: BeamStatus.LOADED,
          loadedMachineNumber: 'L-01',
          isActive: true,
          createdBy: factoryAdminA._id,
          updatedBy: factoryAdminA._id,
        },
        {
          beamNumber: 'BM-103',
          normalizedBeamNumber: normalizeBeamNumber('BM-103'),
          pipeNumber: 'P-13',
          factoryId: factoryA._id,
          fabricId: fabricA._id,
          warpYarnId: warpYarnA._id,
          originalLengthMeters: 8000,
          remainingLengthMeters: 0,
          alertAtMeters: 500,
          ends: 4800,
          status: BeamStatus.FINISHED,
          isActive: true,
          createdBy: factoryAdminA._id,
          updatedBy: factoryAdminA._id,
        },
      ]);
    });

    it('T09: Returns paginated list of beams with computed usedLength and isLowMeters', async () => {
      const res = await agent
        .get('/api/v1/beams?page=1&limit=10')
        .set('Cookie', getAuthCookie(factoryAdminA));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(3);
      expect(res.body.data.pagination.totalItems).toBe(3);

      const bm102 = res.body.data.items.find((b: any) => b.beamNumber === 'BM-102');
      expect(bm102.isLowMeters).toBe(true);
      expect(bm102.usedLengthMeters).toBe(8650);
    });

    it('T10: Low-meter filter returns only beams with remainingLength <= alertAtMeters', async () => {
      const res = await agent
        .get('/api/v1/beams?lowMeters=true')
        .set('Cookie', getAuthCookie(factoryAdminA));

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(2); // BM-102 (350m) and BM-103 (0m)
      const numbers = res.body.data.items.map((b: any) => b.beamNumber);
      expect(numbers).toContain('BM-102');
      expect(numbers).toContain('BM-103');
      expect(numbers).not.toContain('BM-101');
    });

    it('T11: Status filter returns only matching status beams', async () => {
      const res = await agent
        .get(`/api/v1/beams?status=${BeamStatus.LOADED}`)
        .set('Cookie', getAuthCookie(factoryAdminA));

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].beamNumber).toBe('BM-102');
    });

    it('T12: Search works across beamNumber and pipeNumber', async () => {
      const res = await agent
        .get('/api/v1/beams?search=P-11')
        .set('Cookie', getAuthCookie(factoryAdminA));

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].beamNumber).toBe('BM-101');
    });
  });

  describe('Multi-Tenancy & Beam Lifecycle (Load, Unload, History)', () => {
    let testBeam: any;

    beforeEach(async () => {
      testBeam = await Beam.create({
        beamNumber: 'BM-LIFE-01',
        normalizedBeamNumber: normalizeBeamNumber('BM-LIFE-01'),
        factoryId: factoryA._id,
        fabricId: fabricA._id,
        warpYarnId: warpYarnA._id,
        originalLengthMeters: 6000,
        remainingLengthMeters: 6000,
        alertAtMeters: 500,
        ends: 5000,
        status: BeamStatus.IN_GODOWN,
        isActive: true,
        createdBy: factoryAdminA._id,
        updatedBy: factoryAdminA._id,
      });
    });

    it('T13: Factory B cannot access or modify Factory A beam (returns 404)', async () => {
      const getRes = await agent
        .get(`/api/v1/beams/${testBeam._id}`)
        .set('Cookie', getAuthCookie(factoryAdminB));
      expect(getRes.status).toBe(404);

      const patchRes = await agent
        .patch(`/api/v1/beams/${testBeam._id}`)
        .set('Cookie', getAuthCookie(factoryAdminB))
        .send({ notes: 'Tamper' });
      expect(patchRes.status).toBe(404);
    });

    it('T14: Loading beam transitions status to LOADED and records history', async () => {
      const loadRes = await agent
        .post(`/api/v1/beams/${testBeam._id}/load`)
        .set('Cookie', getAuthCookie(operatorA))
        .send({
          machineNumber: 'WJ-Loom-05',
          notes: 'Mounted on Loom 05 by operator',
        });

      expect(loadRes.status).toBe(200);
      expect(loadRes.body.data.status).toBe(BeamStatus.LOADED);
      expect(loadRes.body.data.loadedMachineNumber).toBe('WJ-LOOM-05');
      expect(loadRes.body.data.loadedAt).toBeDefined();

      // Check history endpoint
      const histRes = await agent
        .get(`/api/v1/beams/${testBeam._id}/history`)
        .set('Cookie', getAuthCookie(operatorA));

      expect(histRes.status).toBe(200);
      expect(histRes.body.data.length).toBe(1);
      expect(histRes.body.data[0].status).toBe(BeamStatus.LOADED);
      expect(histRes.body.data[0].startingMeters).toBe(6000);
      expect(histRes.body.data[0].machineNumber).toBe('WJ-LOOM-05');
    });

    it('T15: Rejects loading an already LOADED beam with 409', async () => {
      // First load
      await agent
        .post(`/api/v1/beams/${testBeam._id}/load`)
        .set('Cookie', getAuthCookie(operatorA))
        .send({ machineNumber: 'WJ-Loom-01' });

      // Second load attempt on same beam
      const secondRes = await agent
        .post(`/api/v1/beams/${testBeam._id}/load`)
        .set('Cookie', getAuthCookie(operatorA))
        .send({ machineNumber: 'WJ-Loom-02' });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.success).toBe(false);
    });

    it('T16: Unloading beam records ending meters and updates status to FINISHED', async () => {
      // Load first
      await agent
        .post(`/api/v1/beams/${testBeam._id}/load`)
        .set('Cookie', getAuthCookie(operatorA))
        .send({ machineNumber: 'WJ-Loom-03' });

      // Unload as FINISHED with 0 remaining meters
      const unloadRes = await agent
        .post(`/api/v1/beams/${testBeam._id}/unload`)
        .set('Cookie', getAuthCookie(operatorA))
        .send({
          outcomeStatus: BeamStatus.FINISHED,
          endingMeters: 0,
          notes: 'Beam finished completely',
        });

      expect(unloadRes.status).toBe(200);
      expect(unloadRes.body.data.status).toBe(BeamStatus.FINISHED);
      expect(unloadRes.body.data.remainingLengthMeters).toBe(0);
      expect(unloadRes.body.data.loadedMachineNumber).toBeUndefined();

      // Verify history recorded
      const histRes = await agent
        .get(`/api/v1/beams/${testBeam._id}/history`)
        .set('Cookie', getAuthCookie(operatorA));

      expect(histRes.status).toBe(200);
      expect(histRes.body.data.length).toBe(2);
      expect(histRes.body.data[0].endingMeters).toBe(0);
      expect(histRes.body.data[0].usedMeters).toBe(6000);
    });

    it('T17: Soft deactivation and reactivation works via /api/v1/beams/:id/active', async () => {
      const deactRes = await agent
        .patch(`/api/v1/beams/${testBeam._id}/active`)
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({ isActive: false });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.isActive).toBe(false);

      const check = await Beam.findById(testBeam._id);
      expect(check?.isActive).toBe(false);
    });
  });
});
