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
    name: 'Shree Brahmanikrupa Textile',
    code: 'SBKT01',
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

describe('Phase 9 — Settings & System Configuration', () => {
  let factory: Awaited<ReturnType<typeof createTestFactory>>;
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;
  let operatorUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    factory = await createTestFactory();
    adminUser = await createTestUser({
      name: 'Admin User',
      email: 'admin@sbkt.com',
      role: UserRole.FACTORY_ADMIN,
      factoryId: factory._id,
    });
    operatorUser = await createTestUser({
      name: 'Loom Operator',
      email: 'operator@sbkt.com',
      role: UserRole.OPERATOR,
      factoryId: factory._id,
    });
  });

  // ─── FACTORY PROFILE ────────────────────────────────────────────────────────
  describe('Factory Profile Settings', () => {
    it('allows authenticated users to read factory profile', async () => {
      const res = await agent
        .get('/api/v1/settings/factory')
        .set(authHeader(operatorUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Shree Brahmanikrupa Textile');
      expect(res.body.data.code).toBe('SBKT01');
    });

    it('allows admin to update factory profile', async () => {
      const res = await agent
        .patch('/api/v1/settings/factory')
        .set(authHeader(adminUser))
        .send({
          name: 'Shree Brahmanikrupa Textile - Main Plant',
          address: 'Plot 42, GIDC Sachin, Surat',
          phone: '+91 98765 43210',
          email: 'info@sbkt-textiles.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Shree Brahmanikrupa Textile - Main Plant');
      expect(res.body.data.address).toBe('Plot 42, GIDC Sachin, Surat');

      // Verify persistence in DB
      const updated = await Factory.findById(factory._id);
      expect(updated?.name).toBe('Shree Brahmanikrupa Textile - Main Plant');
      expect(updated?.code).toBe('SBKT01'); // Code remains intact
    });

    it('rejects factory profile update from unauthorized OPERATOR', async () => {
      const res = await agent
        .patch('/api/v1/settings/factory')
        .set(authHeader(operatorUser))
        .send({
          name: 'Hacked Factory Name',
        });

      expect(res.status).toBe(403);
    });

    it('rejects invalid email or empty factory name', async () => {
      const res = await agent
        .patch('/api/v1/settings/factory')
        .set(authHeader(adminUser))
        .send({
          name: 'A', // min 2
          email: 'not-an-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PRODUCTION PREFERENCES ─────────────────────────────────────────────────
  describe('Production Preferences Settings', () => {
    it('returns default shift durations (11h Day, 13h Night) when not customized', async () => {
      const res = await agent
        .get('/api/v1/settings/production')
        .set(authHeader(operatorUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dayShiftDurationHours).toBe(11);
      expect(res.body.data.nightShiftDurationHours).toBe(13);
      expect(res.body.data.dayShiftStartTime).toBe('08:00');
      expect(res.body.data.nightShiftStartTime).toBe('19:00');
    });

    it('allows admin to update production preferences within valid constraints', async () => {
      const res = await agent
        .patch('/api/v1/settings/production')
        .set(authHeader(adminUser))
        .send({
          dayShiftDurationHours: 12,
          nightShiftDurationHours: 12,
          dayShiftStartTime: '08:00',
          nightShiftStartTime: '20:00',
          defaultEfficiencyMode: 'AUTO',
          lowBeamMeterAlertThreshold: 250,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dayShiftDurationHours).toBe(12);
      expect(res.body.data.nightShiftDurationHours).toBe(12);
      expect(res.body.data.lowBeamMeterAlertThreshold).toBe(250);
    });

    it('rejects production preferences if shifts exceed 24 hours total', async () => {
      const res = await agent
        .patch('/api/v1/settings/production')
        .set(authHeader(adminUser))
        .send({
          dayShiftDurationHours: 14,
          nightShiftDurationHours: 14, // 28 hours total
          dayShiftStartTime: '08:00',
          nightShiftStartTime: '20:00',
          defaultEfficiencyMode: 'AUTO',
          lowBeamMeterAlertThreshold: 200,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects production preferences update from non-admin operator', async () => {
      const res = await agent
        .patch('/api/v1/settings/production')
        .set(authHeader(operatorUser))
        .send({
          dayShiftDurationHours: 12,
          nightShiftDurationHours: 12,
          dayShiftStartTime: '08:00',
          nightShiftStartTime: '20:00',
          defaultEfficiencyMode: 'AUTO',
          lowBeamMeterAlertThreshold: 200,
        });

      expect(res.status).toBe(403);
    });
  });

  // ─── ACCOUNT SETTINGS ───────────────────────────────────────────────────────
  describe('Account Settings & Profile Management', () => {
    it('allows current user to update their own profile name', async () => {
      const res = await agent
        .patch('/api/v1/settings/account/profile')
        .set(authHeader(operatorUser))
        .send({
          name: 'Updated Loom Operator',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Updated Loom Operator');

      const userInDb = await User.findById(operatorUser._id);
      expect(userInDb?.name).toBe('Updated Loom Operator');
    });

    it('allows user to save theme and language preferences', async () => {
      const res = await agent
        .patch('/api/v1/settings/account/preferences')
        .set(authHeader(operatorUser))
        .send({
          theme: 'light',
          language: 'gu',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.preferences.theme).toBe('light');
      expect(res.body.data.user.preferences.language).toBe('gu');
    });

    it('allows user to change password with correct current password', async () => {
      const res = await agent
        .patch('/api/v1/settings/account/change-password')
        .set(authHeader(operatorUser))
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewSecurePassword456!',
          confirmPassword: 'NewSecurePassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify the new password works
      const loginRes = await agent.post('/api/v1/auth/login').send({
        email: operatorUser.email,
        password: 'NewSecurePassword456!',
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });

    it('rejects password change if current password is wrong', async () => {
      const res = await agent
        .patch('/api/v1/settings/account/change-password')
        .set(authHeader(operatorUser))
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewSecurePassword456!',
          confirmPassword: 'NewSecurePassword456!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects password change if confirm password does not match', async () => {
      const res = await agent
        .patch('/api/v1/settings/account/change-password')
        .set(authHeader(operatorUser))
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewSecurePassword456!',
          confirmPassword: 'DifferentPassword456!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── SYSTEM INFORMATION ─────────────────────────────────────────────────────
  describe('System Information Diagnostics', () => {
    it('returns safe system diagnostics without revealing secrets', async () => {
      const res = await agent
        .get('/api/v1/settings/system')
        .set(authHeader(operatorUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.name).toBe('SBKT Loom Production & Efficiency Management System');
      expect(res.body.data.server.status).toBe('ONLINE');
      expect(res.body.data.database.provider).toBe('MongoDB');
      expect(res.body.data.features.length).toBe(9);

      // Verify no secrets/credentials leaked
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('mongodb://');
      expect(bodyStr).not.toContain('JWT_SECRET');
      expect(bodyStr).not.toContain('COOKIE_SECRET');
      expect(bodyStr).not.toContain('passwordHash');
    });
  });
});
