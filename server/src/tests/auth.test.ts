import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { User, UserRole } from '../modules/user/user.model';
import { Factory } from '../modules/factory/factory.model';
import { signAccessToken } from '../utils/jwt';
import { Types } from 'mongoose';

const app = createApp();
const agent = request(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createTestFactory() {
  return Factory.create({
    name: 'Test Factory',
    code: 'TEST01',
    timezone: 'Asia/Kolkata',
    isActive: true,
  });
}

async function createTestUser(
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    factoryId: Types.ObjectId;
  }> = {},
) {
  const password = overrides.password ?? 'TestPassword123!@#';
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

function getCookieFromResponse(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as string | string[] | undefined;
  if (!cookies) return '';
  const list = Array.isArray(cookies) ? cookies : [cookies];
  const token = list.find((c) => c.startsWith('sbkt_token='));
  return token ?? '';
}

// ─── AUTH TESTS ───────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  let factory: Awaited<ReturnType<typeof createTestFactory>>;

  beforeEach(async () => {
    factory = await createTestFactory();
    await createTestUser({ email: 'active@test.com', factoryId: factory._id });
    await createTestUser({
      email: 'inactive@test.com',
      factoryId: factory._id,
      isActive: false,
    });
  });

  it('T01: returns 200 and sets cookie on successful login', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'active@test.com', password: 'TestPassword123!@#' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('active@test.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(getCookieFromResponse(res)).toContain('sbkt_token=');
    expect(getCookieFromResponse(res)).toContain('HttpOnly');
  });

  it('T02: returns 401 for wrong password', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'active@test.com', password: 'WrongPassword999!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // Generic message — does not reveal whether email exists
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('T03: returns 401 for unknown email (same message as wrong password)', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@unknown.com', password: 'TestPassword123!@#' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('T04: returns 401 for inactive account (same generic message)', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@test.com', password: 'TestPassword123!@#' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('T05: returns 400 for missing email field', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ password: 'TestPassword123!@#' });

    expect(res.status).toBe(400);
  });

  it('T06: returns 400 for invalid email format', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'TestPassword123!@#' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/me', () => {
  let factory: Awaited<ReturnType<typeof createTestFactory>>;

  beforeEach(async () => {
    factory = await createTestFactory();
  });

  it('T09: returns 401 for unauthenticated request', async () => {
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('T10: returns user profile for authenticated request', async () => {
    const user = await createTestUser({ factoryId: factory._id });
    const token = signAccessToken(user._id, user.role, user.factoryId);

    const res = await agent
      .get('/api/v1/auth/me')
      .set('Cookie', `sbkt_token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('T12: returns 401 for expired/invalid token', async () => {
    const res = await agent
      .get('/api/v1/auth/me')
      .set('Cookie', 'sbkt_token=invalid.token.value');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('T11: clears the auth cookie and returns 200', async () => {
    const res = await agent.post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Cookie should be cleared (Max-Age=0 or expires in past)
    const cookie = getCookieFromResponse(res);
    expect(cookie).toContain('sbkt_token=;');
  });
});

describe('Registration validation', () => {
  it('T07: returns error for password shorter than 12 chars', async () => {
    const factory = await createTestFactory();
    const admin = await createTestUser({
      role: UserRole.SUPER_ADMIN,
      email: 'admin@test.com',
      factoryId: factory._id,
    });
    const token = signAccessToken(admin._id, admin.role);

    const res = await agent
      .post('/api/v1/auth/register')
      .set('Cookie', `sbkt_token=${token}`)
      .send({ name: 'New User', email: 'new@test.com', password: 'short' });

    expect(res.status).toBe(400);
  });
});

// ─── AUTHORIZATION TESTS ──────────────────────────────────────────────────────
describe('User management authorization', () => {
  let factory: Awaited<ReturnType<typeof createTestFactory>>;
  let factory2: Awaited<ReturnType<typeof createTestFactory>>;
  let superAdmin: Awaited<ReturnType<typeof createTestUser>>;
  let factoryAdmin: Awaited<ReturnType<typeof createTestUser>>;
  let viewer: Awaited<ReturnType<typeof createTestUser>>;
  let operator: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    factory = await createTestFactory();
    factory2 = await Factory.create({ name: 'Factory 2', code: 'FAC2', timezone: 'Asia/Kolkata' });

    superAdmin = await createTestUser({ role: UserRole.SUPER_ADMIN, email: 'sa@test.com', factoryId: factory._id });
    factoryAdmin = await createTestUser({ role: UserRole.FACTORY_ADMIN, email: 'fa@test.com', factoryId: factory._id });
    viewer = await createTestUser({ role: UserRole.VIEWER, email: 'viewer@test.com', factoryId: factory._id });
    operator = await createTestUser({ role: UserRole.OPERATOR, email: 'op@test.com', factoryId: factory._id });
  });

  it('T13: VIEWER cannot access /users', async () => {
    const token = signAccessToken(viewer._id, viewer.role, viewer.factoryId);
    const res = await agent.get('/api/v1/users').set('Cookie', `sbkt_token=${token}`);
    expect(res.status).toBe(403);
  });

  it('T14: OPERATOR cannot manage users', async () => {
    const token = signAccessToken(operator._id, operator.role, operator.factoryId);
    const res = await agent.get('/api/v1/users').set('Cookie', `sbkt_token=${token}`);
    expect(res.status).toBe(403);
  });

  it('T15: FACTORY_ADMIN cannot see another factory\'s users', async () => {
    const otherUser = await createTestUser({
      email: 'other@test.com',
      factoryId: factory2._id,
    });
    const token = signAccessToken(factoryAdmin._id, factoryAdmin.role, factoryAdmin.factoryId);
    const res = await agent
      .get(`/api/v1/users/${otherUser._id.toString()}`)
      .set('Cookie', `sbkt_token=${token}`);
    expect(res.status).toBe(404);
  });

  it('T16: FACTORY_ADMIN cannot create SUPER_ADMIN', async () => {
    const token = signAccessToken(factoryAdmin._id, factoryAdmin.role, factoryAdmin.factoryId);
    const res = await agent
      .post('/api/v1/users')
      .set('Cookie', `sbkt_token=${token}`)
      .send({ name: 'Bad Admin', email: 'badadmin@test.com', password: 'BadPassword123!@#', role: 'SUPER_ADMIN' });
    expect(res.status).toBe(403);
  });

  it('T18: unauthenticated users cannot access /users', async () => {
    const res = await agent.get('/api/v1/users');
    expect(res.status).toBe(401);
  });
});

// ─── BOOTSTRAP TESTS ──────────────────────────────────────────────────────────
describe('Bootstrap endpoint', () => {
  it('T20: returns 404 when BOOTSTRAP_ENABLED=false', async () => {
    const res = await agent
      .post('/api/v1/auth/bootstrap')
      .set('x-bootstrap-secret', 'doesnotmatter')
      .send({ factoryName: 'F', factoryCode: 'F1', adminName: 'A', adminEmail: 'a@a.com', adminPassword: 'Password123456!' });

    expect(res.status).toBe(404);
  });
});

// ─── API RESPONSE SHAPE TESTS ─────────────────────────────────────────────────
describe('API response consistency', () => {
  it('T25/T26/T27: health endpoint returns consistent shape', async () => {
    const res = await agent.get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('T27: 404 uses standard error shape', async () => {
    const res = await agent.get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('T28: login response does not include passwordHash', async () => {
    const factory = await createTestFactory();
    await createTestUser({ email: 'check@test.com', factoryId: factory._id });

    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'check@test.com', password: 'TestPassword123!@#' });

    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('__v');
  });
});
