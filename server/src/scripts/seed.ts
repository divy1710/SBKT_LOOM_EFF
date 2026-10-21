/**
 * seed.ts — Inserts dummy data for development and testing.
 *
 * Creates:
 *  - 2 Factories
 *  - 5 Users (one per role)
 *
 * Run with:
 *   npx tsx server/src/scripts/seed.ts
 *
 * Safe to re-run: existing records are skipped (upsert on email/code).
 *
 * ⚠️  NEVER run against a production database.
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Factory } from '../modules/factory/factory.model';
import { User, UserRole } from '../modules/user/user.model';

const BCRYPT_ROUNDS = 12;

// ─── Dummy data ───────────────────────────────────────────────────────────────
const FACTORIES = [
  {
    name: 'SBKT Main Factory',
    code: 'SBKT01',
    address: '14 Industrial Zone, Surat, Gujarat',
    phone: '+91-261-2345678',
    email: 'main@sbkt.com',
    timezone: 'Asia/Kolkata',
    isActive: true,
  },
  {
    name: 'SBKT North Unit',
    code: 'SBKT02',
    address: '7 Mill Road, Ahmedabad, Gujarat',
    phone: '+91-79-2345678',
    email: 'north@sbkt.com',
    timezone: 'Asia/Kolkata',
    isActive: true,
  },
];

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  factoryIndex: number | null; // index into FACTORIES array, null = no factory
}

const USERS: SeedUser[] = [
  {
    name: 'System Administrator',
    email: 'superadmin@sbkt.com',
    password: 'Admin@123456789',
    role: UserRole.SUPER_ADMIN,
    factoryIndex: 0,
  },
  {
    name: 'Factory Admin (Main)',
    email: 'factoryadmin@sbkt.com',
    password: 'Admin@123456789',
    role: UserRole.FACTORY_ADMIN,
    factoryIndex: 0,
  },
  {
    name: 'Production Manager',
    email: 'manager@sbkt.com',
    password: 'Admin@123456789',
    role: UserRole.MANAGER,
    factoryIndex: 0,
  },
  {
    name: 'Loom Operator',
    email: 'operator@sbkt.com',
    password: 'Admin@123456789',
    role: UserRole.OPERATOR,
    factoryIndex: 0,
  },
  {
    name: 'Data Viewer',
    email: 'viewer@sbkt.com',
    password: 'Admin@123456789',
    role: UserRole.VIEWER,
    factoryIndex: 0,
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────
async function seed() {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    console.error('❌  MONGODB_URI not set. Check server/.env');
    process.exit(1);
  }

  console.log(`\n🌱  Connecting to: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
  await mongoose.connect(uri);
  console.log('✅  Connected.\n');

  // ── Factories ──────────────────────────────────────────────────────────────
  const factoryIds: mongoose.Types.ObjectId[] = [];
  for (const f of FACTORIES) {
    const existing = await Factory.findOne({ code: f.code });
    if (existing) {
      console.log(`   ⏭  Factory "${f.name}" (${f.code}) already exists — skipping.`);
      factoryIds.push(existing._id as mongoose.Types.ObjectId);
    } else {
      const created = await Factory.create(f);
      console.log(`   ✅  Factory created: "${f.name}" (${f.code})`);
      factoryIds.push(created._id as mongoose.Types.ObjectId);
    }
  }

  console.log('');

  // ── Users ──────────────────────────────────────────────────────────────────
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`   ⏭  User "${u.email}" already exists — skipping.`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    const factoryId = u.factoryIndex !== null ? factoryIds[u.factoryIndex] : undefined;
    await User.create({
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
      factoryId,
      isActive: true,
    });
    console.log(`   ✅  User created: ${u.email} (${u.role})`);
  }

  // ── Sample Yarns ────────────────────────────────────────────────────────────
  const adminUser = await User.findOne({ email: 'factoryadmin@sbkt.com' });
  const mainFactoryId = factoryIds[0];
  if (adminUser && mainFactoryId) {
    const SAMPLE_YARNS = [
      { name: 'Rayon Slub', denier: 150, yarnType: 'WEFT', rate: 125, rateUnit: 'KG', description: 'High-grade rayon slub yarn for weft' },
      { name: 'Roto', denier: 75, yarnType: 'WARP', rate: 110, rateUnit: 'KG', description: 'Roto textured yarn for warp beams' },
      { name: 'Polyester FDY', denier: 150, yarnType: 'BOTH', rate: 120, rateUnit: 'KG', description: 'Fully drawn polyester yarn versatile for warp and weft' },
      { name: 'Cotton Combed 40s', denier: 133, yarnType: 'WARP', rate: 240, rateUnit: 'KG', description: 'Fine combed pure cotton yarn' },
      { name: 'Nylon DTY', denier: 70, yarnType: 'BOTH', rate: 195, rateUnit: 'KG', description: 'Drawn textured nylon for high elasticity fabrics' },
    ];

    console.log('');
    const { Yarn, normalizeYarnName } = await import('../modules/yarn/yarn.model');
    for (const y of SAMPLE_YARNS) {
      const normalizedName = normalizeYarnName(y.name);
      const existing = await Yarn.findOne({
        factoryId: mainFactoryId,
        normalizedName,
        denier: y.denier,
        yarnType: y.yarnType,
      });
      if (existing) {
        console.log(`   ⏭  Yarn "${y.name}" already exists — skipping.`);
      } else {
        await Yarn.create({
          ...y,
          normalizedName,
          factoryId: mainFactoryId,
          isActive: true,
          createdBy: adminUser._id,
          updatedBy: adminUser._id,
        });
        console.log(`   ✅  Yarn created: "${y.name}" (${y.denier}D, ${y.yarnType})`);
      }
    }
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('🎉  Seed complete! Login credentials:\n');
  console.log('  Role           │ Email                    │ Password');
  console.log('  ───────────────┼──────────────────────────┼──────────────────');
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(15)}│ ${u.email.padEnd(26)}│ ${u.password}`);
  }
  console.log('\n  URL: http://localhost:5173/login');
  console.log('─────────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
