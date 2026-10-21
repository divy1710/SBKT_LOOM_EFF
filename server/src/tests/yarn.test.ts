import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { User, UserRole, IUser } from '../modules/user/user.model';
import { Factory, IFactory } from '../modules/factory/factory.model';
import { Yarn, YarnType, RateUnit } from '../modules/yarn/yarn.model';
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

// ─── YARN MASTER BACKEND TESTS ────────────────────────────────────────────────
describe('Yarn Master Module (/api/v1/yarn)', () => {
  let factoryA: IFactory;
  let factoryB: IFactory;

  let superAdmin: IUser;
  let factoryAdminA: IUser;
  let factoryAdminB: IUser;
  let managerA: IUser;
  let operatorA: IUser;
  let viewerA: IUser;

  beforeEach(async () => {
    factoryA = await createFactory('Factory Alpha', 'FAC01');
    factoryB = await createFactory('Factory Beta', 'FAC02');

    superAdmin = await createUser('super@test.com', UserRole.SUPER_ADMIN, factoryA._id);
    factoryAdminA = await createUser('admin.a@test.com', UserRole.FACTORY_ADMIN, factoryA._id);
    factoryAdminB = await createUser('admin.b@test.com', UserRole.FACTORY_ADMIN, factoryB._id);
    managerA = await createUser('manager.a@test.com', UserRole.MANAGER, factoryA._id);
    operatorA = await createUser('operator.a@test.com', UserRole.OPERATOR, factoryA._id);
    viewerA = await createUser('viewer.a@test.com', UserRole.VIEWER, factoryA._id);
  });

  // 1. Authorized user can create yarn
  it('T01: Authorized user (FACTORY_ADMIN) can create yarn', async () => {
    const res = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Cotton Combed',
        denier: 40,
        yarnType: 'WARP',
        rate: 220,
        rateUnit: 'KG',
        description: 'Premium combed cotton yarn',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Cotton Combed');
    expect(res.body.data.denier).toBe(40);
    expect(res.body.data.yarnType).toBe('WARP');
    expect(res.body.data.rate).toBe(220);
    expect(res.body.data.rateUnit).toBe('KG');
    expect(res.body.data.factoryId).toBe(factoryA._id.toString());
    expect(res.body.data.isActive).toBe(true);
  });

  // 2. Unauthorized user cannot create yarn
  it('T02: Unauthorized user cannot create yarn (unauthenticated)', async () => {
    const res = await agent.post('/api/v1/yarn').send({
      name: 'Polyester Slub',
      denier: 150,
      yarnType: 'WEFT',
      rate: 130,
    });

    expect(res.status).toBe(401);
  });

  // 3. Valid yarn can be retrieved
  it('T03: Valid yarn can be retrieved', async () => {
    const yarn = await Yarn.create({
      name: 'Nylon Textured',
      normalizedName: 'nylon textured',
      denier: 70,
      yarnType: YarnType.BOTH,
      rate: 180,
      rateUnit: RateUnit.KG,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    const res = await agent
      .get(`/api/v1/yarn/${yarn._id}`)
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Nylon Textured');
    expect(res.body.data.denier).toBe(70);
  });

  // 4. Unknown yarn ID returns 404
  it('T04: Unknown yarn ID returns 404', async () => {
    const nonExistentId = new Types.ObjectId().toString();
    const res = await agent
      .get(`/api/v1/yarn/${nonExistentId}`)
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 5. Invalid MongoDB ID is handled safely
  it('T05: Invalid MongoDB ID returns 400', async () => {
    const res = await agent
      .get('/api/v1/yarn/invalid-id-123')
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 6. Yarn can be updated
  it('T06: Yarn can be updated by authorized user', async () => {
    const yarn = await Yarn.create({
      name: 'Spun Polyester',
      normalizedName: 'spun polyester',
      denier: 120,
      yarnType: YarnType.WEFT,
      rate: 95,
      rateUnit: RateUnit.KG,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    const res = await agent
      .patch(`/api/v1/yarn/${yarn._id}`)
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        rate: 105,
        description: 'Revised price for Q4',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.rate).toBe(105);
    expect(res.body.data.description).toBe('Revised price for Q4');
    expect(res.body.data.updatedBy).toBe(factoryAdminA._id.toString());
  });

  // 7. Yarn can be deactivated
  it('T07: Yarn can be deactivated', async () => {
    const yarn = await Yarn.create({
      name: 'Viscose Rayon',
      normalizedName: 'viscose rayon',
      denier: 150,
      yarnType: YarnType.WARP,
      rate: 160,
      rateUnit: RateUnit.KG,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    const res = await agent
      .patch(`/api/v1/yarn/${yarn._id}/status`)
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    // Verify in database that it is not permanently deleted
    const dbYarn = await Yarn.findById(yarn._id);
    expect(dbYarn).not.toBeNull();
    expect(dbYarn?.isActive).toBe(false);
  });

  // 8. Yarn can be reactivated
  it('T08: Yarn can be reactivated', async () => {
    const yarn = await Yarn.create({
      name: 'Inactive Yarn Spec',
      normalizedName: 'inactive yarn spec',
      denier: 80,
      yarnType: YarnType.BOTH,
      rate: 140,
      rateUnit: RateUnit.KG,
      factoryId: factoryA._id,
      isActive: false,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    const res = await agent
      .patch(`/api/v1/yarn/${yarn._id}/status`)
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({ isActive: true });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });

  // 9. Duplicate yarn is rejected
  it('T09: Duplicate yarn is rejected with 409', async () => {
    await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Microfiber Poly',
        denier: 50,
        yarnType: 'WEFT',
        rate: 200,
        rateUnit: 'KG',
      });

    // Attempt to create duplicate with varying casing and whitespace
    const dupRes = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: '  microfiber POLY  ',
        denier: 50,
        yarnType: 'WEFT',
        rate: 210,
        rateUnit: 'KG',
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.message).toContain('already exists');
  });

  // 10. Invalid denier is rejected
  it('T10: Invalid denier (zero or negative) is rejected with 400', async () => {
    const resZero = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Test Denier',
        denier: 0,
        yarnType: 'WARP',
        rate: 100,
      });
    expect(resZero.status).toBe(400);

    const resNeg = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Test Denier Neg',
        denier: -15,
        yarnType: 'WARP',
        rate: 100,
      });
    expect(resNeg.status).toBe(400);
  });

  // 11. Negative rate is rejected
  it('T11: Negative rate is rejected with 400', async () => {
    const res = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Negative Rate Test',
        denier: 100,
        yarnType: 'WARP',
        rate: -5,
      });

    expect(res.status).toBe(400);
  });

  // 12. Invalid yarn type is rejected
  it('T12: Invalid yarn type is rejected with 400', async () => {
    const res = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Invalid Type Test',
        denier: 100,
        yarnType: 'INVALID_TYPE',
        rate: 100,
      });

    expect(res.status).toBe(400);
  });

  // 13. Missing required fields are rejected
  it('T13: Missing required fields are rejected with 400', async () => {
    const res = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Missing Fields',
      });

    expect(res.status).toBe(400);
  });

  // 14. Pagination works
  it('T14: Pagination returns correct pages and limit', async () => {
    // Insert 5 test yarns
    for (let i = 1; i <= 5; i++) {
      await Yarn.create({
        name: `Paging Yarn ${i}`,
        normalizedName: `paging yarn ${i}`,
        denier: 100 + i,
        yarnType: YarnType.WARP,
        rate: 100,
        rateUnit: RateUnit.KG,
        factoryId: factoryA._id,
        isActive: true,
        createdBy: factoryAdminA._id,
        updatedBy: factoryAdminA._id,
      });
    }

    const res = await agent
      .get('/api/v1/yarn?page=1&limit=2')
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(2);
    expect(res.body.data.pagination.totalItems).toBe(5);
    expect(res.body.data.pagination.totalPages).toBe(3);
  });

  // 15. Search works (by name and by denier)
  it('T15: Search works by name and by denier', async () => {
    await Yarn.create({
      name: 'Special Silk Yarn',
      normalizedName: 'special silk yarn',
      denier: 35,
      yarnType: YarnType.WEFT,
      rate: 500,
      rateUnit: RateUnit.KG,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    await Yarn.create({
      name: 'Linen Blend',
      normalizedName: 'linen blend',
      denier: 250,
      yarnType: YarnType.WARP,
      rate: 300,
      rateUnit: RateUnit.KG,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    // Search by name
    const resName = await agent
      .get('/api/v1/yarn?search=Silk')
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(resName.status).toBe(200);
    expect(resName.body.data.items.length).toBe(1);
    expect(resName.body.data.items[0].name).toBe('Special Silk Yarn');

    // Search by denier
    const resDenier = await agent
      .get('/api/v1/yarn?search=250')
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(resDenier.status).toBe(200);
    expect(resDenier.body.data.items.length).toBe(1);
    expect(resDenier.body.data.items[0].name).toBe('Linen Blend');
  });

  // 16. Yarn-type filtering works
  it('T16: Yarn-type filtering works', async () => {
    await Yarn.create({
      name: 'Warp Yarn Spec',
      normalizedName: 'warp yarn spec',
      denier: 80,
      yarnType: YarnType.WARP,
      rate: 120,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    await Yarn.create({
      name: 'Weft Yarn Spec',
      normalizedName: 'weft yarn spec',
      denier: 80,
      yarnType: YarnType.WEFT,
      rate: 120,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    const res = await agent
      .get('/api/v1/yarn?yarnType=WEFT')
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(res.status).toBe(200);
    expect(res.body.data.items.every((y: { yarnType: string }) => y.yarnType === 'WEFT')).toBe(true);
  });

  // 17. Active-status filtering works
  it('T17: Active-status filtering works', async () => {
    await Yarn.create({
      name: 'Active Yarn A',
      normalizedName: 'active yarn a',
      denier: 100,
      yarnType: YarnType.WARP,
      rate: 100,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    await Yarn.create({
      name: 'Inactive Yarn B',
      normalizedName: 'inactive yarn b',
      denier: 100,
      yarnType: YarnType.WARP,
      rate: 100,
      factoryId: factoryA._id,
      isActive: false,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    const res = await agent
      .get('/api/v1/yarn?isActive=false')
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].name).toBe('Inactive Yarn B');
  });

  // 18. Factory A cannot access Factory B's yarn
  it("T18: Factory A cannot access Factory B's yarn (returns 404)", async () => {
    const yarnB = await Yarn.create({
      name: 'Factory B Secret Yarn',
      normalizedName: 'factory b secret yarn',
      denier: 150,
      yarnType: YarnType.WARP,
      rate: 200,
      rateUnit: RateUnit.KG,
      factoryId: factoryB._id,
      isActive: true,
      createdBy: factoryAdminB._id,
      updatedBy: factoryAdminB._id,
    });

    // Factory A admin requests Factory B yarn
    const res = await agent
      .get(`/api/v1/yarn/${yarnB._id}`)
      .set('Cookie', getAuthCookie(factoryAdminA));

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });

  // 19. Factory A cannot update Factory B's yarn
  it("T19: Factory A cannot update Factory B's yarn (returns 404)", async () => {
    const yarnB = await Yarn.create({
      name: 'Factory B Yarn',
      normalizedName: 'factory b yarn',
      denier: 150,
      yarnType: YarnType.WARP,
      rate: 200,
      factoryId: factoryB._id,
      isActive: true,
      createdBy: factoryAdminB._id,
      updatedBy: factoryAdminB._id,
    });

    const res = await agent
      .patch(`/api/v1/yarn/${yarnB._id}`)
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({ rate: 50 });

    expect(res.status).toBe(404);
  });

  // 20. Client cannot overwrite factoryId
  it('T20: Client cannot overwrite factoryId on create or update', async () => {
    // Try to forge factoryId during creation
    const resCreate = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Forged Factory Test',
        denier: 100,
        yarnType: 'BOTH',
        rate: 150,
        factoryId: factoryB._id.toString(), // attempted forgery
      });

    expect(resCreate.status).toBe(201);
    // Verified that it was saved under Factory A, NOT Factory B
    expect(resCreate.body.data.factoryId).toBe(factoryA._id.toString());

    // Try to forge factoryId during update
    const yarnId = resCreate.body.data.id;
    await agent
      .patch(`/api/v1/yarn/${yarnId}`)
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Updated Name',
        factoryId: factoryB._id.toString(),
      });

    const checkYarn = await Yarn.findById(yarnId);
    expect(checkYarn?.factoryId.toString()).toBe(factoryA._id.toString());
  });

  // 21. Client cannot overwrite createdBy
  it('T21: Client cannot overwrite createdBy', async () => {
    const forgedUserId = new Types.ObjectId().toString();
    const res = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        name: 'Forged User Test',
        denier: 100,
        yarnType: 'BOTH',
        rate: 150,
        createdBy: forgedUserId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.createdBy).toBe(factoryAdminA._id.toString());
  });

  // 22. Client cannot update isActive through the general update endpoint
  it('T22: Client cannot update isActive through general PATCH /api/v1/yarn/:id', async () => {
    const yarn = await Yarn.create({
      name: 'Status Immunity Test',
      normalizedName: 'status immunity test',
      denier: 100,
      yarnType: YarnType.WARP,
      rate: 150,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    await agent
      .patch(`/api/v1/yarn/${yarn._id}`)
      .set('Cookie', getAuthCookie(factoryAdminA))
      .send({
        rate: 160,
        isActive: false, // Attempted status update
      });

    const check = await Yarn.findById(yarn._id);
    expect(check?.rate).toBe(160);
    expect(check?.isActive).toBe(true); // Remained true
  });

  // 23. Viewer can read permitted active records, but not inactive
  it('T23: Viewer can read permitted active records and cannot see inactive', async () => {
    const activeYarn = await Yarn.create({
      name: 'Active for Viewer',
      normalizedName: 'active for viewer',
      denier: 90,
      yarnType: YarnType.WARP,
      rate: 110,
      factoryId: factoryA._id,
      isActive: true,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    const inactiveYarn = await Yarn.create({
      name: 'Inactive for Viewer',
      normalizedName: 'inactive for viewer',
      denier: 90,
      yarnType: YarnType.WARP,
      rate: 110,
      factoryId: factoryA._id,
      isActive: false,
      createdBy: factoryAdminA._id,
      updatedBy: factoryAdminA._id,
    });

    // Viewer lists yarns: only active returned
    const listRes = await agent
      .get('/api/v1/yarn')
      .set('Cookie', getAuthCookie(viewerA));

    expect(listRes.status).toBe(200);
    const names = listRes.body.data.items.map((i: { name: string }) => i.name);
    expect(names).toContain('Active for Viewer');
    expect(names).not.toContain('Inactive for Viewer');

    // Viewer gets inactive yarn by ID: returns 404
    const getInactiveRes = await agent
      .get(`/api/v1/yarn/${inactiveYarn._id}`)
      .set('Cookie', getAuthCookie(viewerA));

    expect(getInactiveRes.status).toBe(404);

    // Viewer gets active yarn by ID: returns 200
    const getActiveRes = await agent
      .get(`/api/v1/yarn/${activeYarn._id}`)
      .set('Cookie', getAuthCookie(viewerA));

    expect(getActiveRes.status).toBe(200);
  });

  // 24. Operator cannot create yarn
  it('T24: Operator cannot create yarn (returns 403)', async () => {
    const res = await agent
      .post('/api/v1/yarn')
      .set('Cookie', getAuthCookie(operatorA))
      .send({
        name: 'Operator Attempt',
        denier: 100,
        yarnType: 'WARP',
        rate: 150,
      });

    expect(res.status).toBe(403);
  });

  // 25. Duplicate protection works under concurrent requests
  it('T25: Duplicate protection handles concurrent creation safely', async () => {
    const payload = {
      name: 'Concurrent Unique Yarn',
      denier: 120,
      yarnType: 'WEFT',
      rate: 175,
      rateUnit: 'KG',
    };

    // Execute two simultaneous POST requests
    const [res1, res2] = await Promise.all([
      agent
        .post('/api/v1/yarn')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send(payload),
      agent
        .post('/api/v1/yarn')
        .set('Cookie', getAuthCookie(factoryAdminA))
        .send(payload),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one should succeed with 201, and one should fail with 409
    expect(statuses).toEqual([201, 409]);
  });
});
