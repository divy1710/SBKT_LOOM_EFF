import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { User, UserRole, IUser } from '../modules/user/user.model';
import { Factory, IFactory } from '../modules/factory/factory.model';
import { Yarn, YarnType } from '../modules/yarn/yarn.model';
import { Fabric, IFabric, normalizeFabricCode, normalizeFabricName } from '../modules/fabric/fabric.model';
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
  yarnType: YarnType = YarnType.BOTH,
  name = 'Test Yarn 50D',
  isActive = true,
) {
  return Yarn.create({
    name,
    denier: 50,
    yarnType,
    rate: 180,
    rateUnit: 'KG',
    factoryId,
    createdBy: userId,
    updatedBy: userId,
    isActive,
  });
}

// ─── FABRIC MASTER TESTS ───────────────────────────────────────────────────────
describe('Fabric Master Module (/api/v1/fabrics)', () => {
  let factoryA: IFactory;
  let factoryB: IFactory;

  let factoryAdminA: IUser;
  let factoryAdminB: IUser;
  let operatorA: IUser;
  let viewerA: IUser;

  let warpYarnA: any;
  let weftYarnA: any;
  let bothYarnA: any;
  let inactiveYarnA: any;

  beforeEach(async () => {
    factoryA = await createFactory('Fabric Factory A', 'FFA01');
    factoryB = await createFactory('Fabric Factory B', 'FFB02');

    factoryAdminA = await createUser('fabadmin.a@sbkt.com', UserRole.FACTORY_ADMIN, factoryA._id);
    factoryAdminB = await createUser('fabadmin.b@sbkt.com', UserRole.FACTORY_ADMIN, factoryB._id);
    operatorA = await createUser('operator.a@sbkt.com', UserRole.OPERATOR, factoryA._id);
    viewerA = await createUser('viewer.a@sbkt.com', UserRole.VIEWER, factoryA._id);

    warpYarnA = await createYarnHelper(factoryA._id, factoryAdminA._id, YarnType.WARP, 'Warp Yarn A 75D');
    weftYarnA = await createYarnHelper(factoryA._id, factoryAdminA._id, YarnType.WEFT, 'Weft Yarn A 150D');
    bothYarnA = await createYarnHelper(factoryA._id, factoryAdminA._id, YarnType.BOTH, 'Dual Purpose Yarn 100D');
    inactiveYarnA = await createYarnHelper(factoryA._id, factoryAdminA._id, YarnType.WARP, 'Archived Yarn 80D', false);
  });

  describe('POST /api/v1/fabrics - Creation & Validation', () => {
    it('T01: Authorized FACTORY_ADMIN can create a new fabric with panno (preserves decimals)', async () => {
      const res = await agent
        .post('/api/v1/fabrics')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({
          code: 'FAB-RAYON-63',
          name: 'Plain Rayon 63 inch',
          warpYarnId: warpYarnA._id.toString(),
          weftYarnId: weftYarnA._id.toString(),
          ppi: 56,
          panno: 44.5,
          wastagePercent: 3.5,
          recommendedRpm: 550,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('FAB-RAYON-63');
      expect(res.body.data.ppi).toBe(56);
      expect(res.body.data.panno).toBe(44.5);
      expect(res.body.data.widthInches).toBeUndefined();
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.factoryId.toString()).toBe(factoryA._id.toString());
    });

    it('T02: Rejects unauthenticated request with 401', async () => {
      const res = await agent
        .post('/api/v1/fabrics')
        .send({
          code: 'FAB-UNAUTH',
          name: 'Unauth Fabric',
          warpYarnId: warpYarnA._id.toString(),
          weftYarnId: weftYarnA._id.toString(),
          ppi: 50,
          panno: 58,
          wastagePercent: 3.0,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('T03: Rejects OPERATOR role with 403', async () => {
      const res = await agent
        .post('/api/v1/fabrics')
        .set('Cookie', getAuthCookie(operatorA))
        .send({
          code: 'FAB-OP',
          name: 'Operator Fabric',
          warpYarnId: warpYarnA._id.toString(),
          weftYarnId: weftYarnA._id.toString(),
          ppi: 50,
          panno: 58,
          wastagePercent: 3.0,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('T04: Rejects duplicate fabric code within the same factory with 409', async () => {
      const fabricPayload = {
        code: 'FAB-DUP-01',
        name: 'Duplicate Test Fabric',
        warpYarnId: warpYarnA._id.toString(),
        weftYarnId: weftYarnA._id.toString(),
        ppi: 50,
        panno: 58,
        wastagePercent: 3.0,
      };

      const res1 = await agent
        .post('/api/v1/fabrics')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send(fabricPayload);
      expect(res1.status).toBe(201);

      const res2 = await agent
        .post('/api/v1/fabrics')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send(fabricPayload);
      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
    });

    it('T05: Rejects invalid or negative panno / parameters with 400', async () => {
      const res = await agent
        .post('/api/v1/fabrics')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({
          code: 'FAB-INVALID',
          name: 'Invalid Fabric',
          warpYarnId: warpYarnA._id.toString(),
          weftYarnId: weftYarnA._id.toString(),
          ppi: 0, // Invalid zero
          panno: -5, // Invalid negative panno
          wastagePercent: 150, // > 100
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/fabrics - Listing & Filtering', () => {
    beforeEach(async () => {
      await Fabric.create([
        {
          code: 'FC-01',
          name: 'Cotton Blend 48',
          normalizedCode: normalizeFabricCode('FC-01'),
          normalizedName: normalizeFabricName('Cotton Blend 48'),
          warpYarnId: warpYarnA._id,
          weftYarnId: weftYarnA._id,
          ppi: 52,
          panno: 48.25,
          wastagePercent: 2.0,
          factoryId: factoryA._id,
          createdBy: factoryAdminA._id,
          updatedBy: factoryAdminA._id,
          isActive: true,
        },
        {
          code: 'FC-02',
          name: 'Polyester Twill 60',
          normalizedCode: normalizeFabricCode('FC-02'),
          normalizedName: normalizeFabricName('Polyester Twill 60'),
          warpYarnId: warpYarnA._id,
          weftYarnId: weftYarnA._id,
          ppi: 60,
          panno: 60.5,
          wastagePercent: 4.5,
          factoryId: factoryA._id,
          createdBy: factoryAdminA._id,
          updatedBy: factoryAdminA._id,
          isActive: false,
        },
      ]);
    });

    it('T06: Returns paginated list of fabrics with panno for current factory', async () => {
      const res = await agent
        .get('/api/v1/fabrics?page=1&limit=10')
        .set('Cookie', getAuthCookie(factoryAdminA));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.items[0].panno).toBeDefined();
      expect(res.body.data.pagination.totalItems).toBe(2);
    });

    it('T07: Search filter by fabric code or name works properly', async () => {
      const res = await agent
        .get('/api/v1/fabrics?search=Twill')
        .set('Cookie', getAuthCookie(factoryAdminA));

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].code).toBe('FC-02');
      expect(res.body.data.items[0].panno).toBe(60.5);
    });

    it('T08: Status filter isActive=true returns only active fabrics', async () => {
      const res = await agent
        .get('/api/v1/fabrics?isActive=true')
        .set('Cookie', getAuthCookie(factoryAdminA));

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].code).toBe('FC-01');
    });
  });

  describe('Multi-Tenancy & Authorization Boundaries', () => {
    let fabricA: IFabric;

    beforeEach(async () => {
      fabricA = await Fabric.create({
        code: 'TENANT-FAB-A',
        name: 'Factory A Fabric',
        normalizedCode: normalizeFabricCode('TENANT-FAB-A'),
        normalizedName: normalizeFabricName('Factory A Fabric'),
        warpYarnId: warpYarnA._id,
        weftYarnId: weftYarnA._id,
        ppi: 50,
        panno: 58.75,
        wastagePercent: 3.0,
        factoryId: factoryA._id,
        createdBy: factoryAdminA._id,
        updatedBy: factoryAdminA._id,
        isActive: true,
      });
    });

    it('T09: Factory B cannot access Factory A fabric (returns 404)', async () => {
      const res = await agent
        .get(`/api/v1/fabrics/${fabricA._id}`)
        .set('Cookie', getAuthCookie(factoryAdminB));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('T10: Factory B cannot update Factory A fabric (returns 404)', async () => {
      const res = await agent
        .patch(`/api/v1/fabrics/${fabricA._id}`)
        .set('Cookie', getAuthCookie(factoryAdminB))
        .send({ name: 'Tampered Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('T11: Factory Admin can update panno via PATCH /api/v1/fabrics/:id', async () => {
      const res = await agent
        .patch(`/api/v1/fabrics/${fabricA._id}`)
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({ panno: 62.25 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.panno).toBe(62.25);

      const check = await Fabric.findById(fabricA._id);
      expect(check?.panno).toBe(62.25);
    });

    it('T12: Factory Admin can toggle fabric status via PATCH /api/v1/fabrics/:id/status', async () => {
      const res = await agent
        .patch(`/api/v1/fabrics/${fabricA._id}/status`)
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);

      const check = await Fabric.findById(fabricA._id);
      expect(check?.isActive).toBe(false);
    });

    it('T13: VIEWER role cannot toggle fabric status (returns 403)', async () => {
      const res = await agent
        .patch(`/api/v1/fabrics/${fabricA._id}/status`)
        .set('Cookie', getAuthCookie(viewerA))
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Yarn Options Query for Fabric Form', () => {
    it('T14: Authenticated user can query active yarns with limit=100 and isActive=true', async () => {
      const res = await agent
        .get('/api/v1/yarn?isActive=true&limit=100&sortBy=name&sortOrder=asc')
        .set('Cookie', getAuthCookie(factoryAdminA));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();

      const items = res.body.data.items;
      // Should include warpYarnA, weftYarnA, bothYarnA
      const names = items.map((i: any) => i.name);
      expect(names).toContain('Warp Yarn A 75D');
      expect(names).toContain('Weft Yarn A 150D');
      expect(names).toContain('Dual Purpose Yarn 100D');
      // Should NOT include inactive yarn
      expect(names).not.toContain('Archived Yarn 80D');
    });
  });
});
