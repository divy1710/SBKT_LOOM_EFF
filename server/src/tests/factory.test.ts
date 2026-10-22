import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { User, UserRole } from '../modules/user/user.model';
import { Factory } from '../modules/factory/factory.model';
import { AuditLog } from '../modules/audit/audit.model';
import { signAccessToken } from '../utils/jwt';

const app = createApp();
const agent = request(app);

describe('Phase 11: Multi-Factory & Super Admin Integration Tests', () => {
  let superAdminToken: string;
  let factoryAdminToken: string;
  let operatorToken: string;

  let factoryA: any;
  let factoryB: any;
  let superAdminUser: any;
  let factoryAdminUser: any;
  let operatorUser: any;

  beforeEach(async () => {
    // 1. Create 2 test factories
    factoryA = await Factory.create({
      name: 'Factory Alpha',
      code: 'ALPHA01',
      address: 'Plot 10, GIDC Industrial Estate',
      city: 'Surat',
      state: 'Gujarat',
      country: 'India',
      phone: '+91-9876543210',
      email: 'alpha@textile.com',
      status: 'ACTIVE',
      isActive: true,
    });

    factoryB = await Factory.create({
      name: 'Factory Beta',
      code: 'BETA01',
      address: 'Sector 4, Textile Hub',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      phone: '+91-9876543211',
      email: 'beta@textile.com',
      status: 'ACTIVE',
      isActive: true,
    });

    // 2. Create users
    const pwdHash = await bcrypt.hash('TestPass123!@#', 10);

    superAdminUser = await User.create({
      name: 'Super Admin',
      email: 'superadmin@platform.com',
      passwordHash: pwdHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    });

    factoryAdminUser = await User.create({
      name: 'Alpha Admin',
      email: 'admin@alpha.com',
      passwordHash: pwdHash,
      role: UserRole.FACTORY_ADMIN,
      factoryId: factoryA._id,
      isActive: true,
    });

    operatorUser = await User.create({
      name: 'Alpha Operator',
      email: 'op@alpha.com',
      passwordHash: pwdHash,
      role: UserRole.OPERATOR,
      factoryId: factoryA._id,
      isActive: true,
    });

    // Generate tokens
    superAdminToken = signAccessToken(
      superAdminUser._id,
      superAdminUser.role,
    );

    factoryAdminToken = signAccessToken(
      factoryAdminUser._id,
      factoryAdminUser.role,
      factoryA._id,
    );

    operatorToken = signAccessToken(
      operatorUser._id,
      operatorUser.role,
      factoryA._id,
    );
  });

  describe('1. Factory CRUD Operations', () => {
    it('Super Admin can create a new factory with unique code and address details', async () => {
      const res = await agent
        .post('/api/v1/factories')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Factory Gamma',
          code: 'GAMMA01',
          address: 'Road 5, Sachin GIDC',
          city: 'Surat',
          state: 'Gujarat',
          country: 'India',
          phone: '+91-9876543212',
          email: 'gamma@textile.com',
          status: 'ACTIVE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Factory Gamma');
      expect(res.body.data.code).toBe('GAMMA01');
      expect(res.body.data.city).toBe('Surat');
    });

    it('Rejects duplicate factory codes', async () => {
      const res = await agent
        .post('/api/v1/factories')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate Alpha',
          code: 'ALPHA01', // already used by factoryA
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/code.*already exists/i);
    });

    it('Factory Admin or Operator cannot create factories (403 Forbidden)', async () => {
      const res = await agent
        .post('/api/v1/factories')
        .set('Authorization', `Bearer ${factoryAdminToken}`)
        .send({
          name: 'Unauthorized Factory',
          code: 'UNAUTH01',
        });

      expect(res.status).toBe(403);
    });

    it('Super Admin can list factories with operational metrics and search filtering', async () => {
      const res = await agent
        .get('/api/v1/factories?search=Alpha')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.factories).toHaveLength(1);
      expect(res.body.data.factories[0].code).toBe('ALPHA01');
      expect(res.body.data.factories[0]).toHaveProperty('userCount');
      expect(res.body.data.factories[0]).toHaveProperty('machineCount');
    });

    it('Super Admin can retrieve factory details including assigned admin and statistics', async () => {
      const res = await agent
        .get(`/api/v1/factories/${factoryA._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(factoryA._id.toString());
      expect(res.body.data.counts).toBeDefined();
      expect(res.body.data.admins).toBeDefined();
    });

    it('Super Admin can update factory details without changing factory code', async () => {
      const res = await agent
        .patch(`/api/v1/factories/${factoryA._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Factory Alpha Renamed',
          city: 'Navsari',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Factory Alpha Renamed');
      expect(res.body.data.city).toBe('Navsari');
      expect(res.body.data.code).toBe('ALPHA01'); // preserved
    });

    it('Super Admin can deactivate and reactivate a factory', async () => {
      // Deactivate
      const deactRes = await agent
        .patch(`/api/v1/factories/${factoryA._id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'INACTIVE' });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.status).toBe('INACTIVE');
      expect(deactRes.body.data.isActive).toBe(false);

      // Verify deactivation check blocks requests from users belonging to inactive factory
      const blockedRes = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${factoryAdminToken}`);

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.message).toMatch(/deactivated/i);

      // Reactivate
      const reactRes = await agent
        .patch(`/api/v1/factories/${factoryA._id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'ACTIVE' });

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.data.status).toBe('ACTIVE');
      expect(reactRes.body.data.isActive).toBe(true);
    });
  });

  describe('2. Factory Admin Assignment & Management', () => {
    it('Super Admin can list, create, and assign Factory Admins', async () => {
      // List
      const listRes = await agent
        .get('/api/v1/factories/admins/all')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Create new Factory Admin for Factory B
      const createRes = await agent
        .post('/api/v1/factories/admins')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Beta Administrator',
          email: 'admin@beta.com',
          password: 'Password123!@#',
          factoryId: factoryB._id.toString(),
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.role).toBe(UserRole.FACTORY_ADMIN);
      expect(createRes.body.data.factoryId).toBe(factoryB._id.toString());
    });

    it('Super Admin can reassign a Factory Admin to another factory', async () => {
      const reassignRes = await agent
        .patch(`/api/v1/factories/admins/${factoryAdminUser._id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          factoryId: factoryB._id.toString(),
        });

      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.data.factoryId).toBe(factoryB._id.toString());
    });

    it('Factory Admin cannot reassign themselves or create another Factory Admin', async () => {
      const res = await agent
        .patch(`/api/v1/factories/admins/${factoryAdminUser._id}/assign`)
        .set('Authorization', `Bearer ${factoryAdminToken}`)
        .send({
          factoryId: factoryB._id.toString(),
        });

      expect(res.status).toBe(403);
    });
  });

  describe('3. Cross-Factory Analytics & Audit Logs', () => {
    it('Super Admin can access cross-factory analytics summaries', async () => {
      const res = await agent
        .get('/api/v1/analytics/cross-factory')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totals).toHaveProperty('totalActiveFactories');
      expect(res.body.data.totals).toHaveProperty('totalPlatformMachines');
      expect(res.body.data.totals).toHaveProperty('totalPlatformUsers');
      expect(res.body.data.factories).toBeInstanceOf(Array);
    });

    it('Factory Admin cannot access cross-factory analytics (403 Forbidden)', async () => {
      const res = await agent
        .get('/api/v1/analytics/cross-factory')
        .set('Authorization', `Bearer ${factoryAdminToken}`);

      expect(res.status).toBe(403);
    });

    it('Administrative operations generate audit log entries viewable by Super Admin', async () => {
      const logsRes = await agent
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(logsRes.status).toBe(200);
      expect(logsRes.body.data.logs).toBeInstanceOf(Array);
      expect(logsRes.body.data.pagination).toBeDefined();
    });
  });
});
