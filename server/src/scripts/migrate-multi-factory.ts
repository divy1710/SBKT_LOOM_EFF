/**
 * migrate-multi-factory.ts
 *
 * Safe, idempotent migration script to audit and associate all legacy
 * unassociated records (from Yarn, Fabric, Beam, Machine, ProductionSheet)
 * with the primary Shree Brahmanikrupa Textile factory.
 *
 * Usage:
 *   npx tsx server/src/scripts/migrate-multi-factory.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Simulates migration, checks for orphans, and prints report without modifying documents.
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Factory } from '../modules/factory/factory.model';
import { User } from '../modules/user/user.model';
import { Yarn } from '../modules/yarn/yarn.model';
import { Fabric } from '../modules/fabric/fabric.model';
import { Beam } from '../modules/beam/beam.model';
import { BeamLoadingHistory } from '../modules/beam/beam-history.model';
import { Machine } from '../modules/machine/machine.model';
import { ProductionSheet } from '../modules/production/production.model';

const isDryRun = process.argv.includes('--dry-run');

async function runMigration() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI / MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🏭 SBKT Multi-Factory Data Migration Tool`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Simulation Only)' : '⚡ LIVE EXECUTION'}`);
  console.log(`======================================================\n`);

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB.');

  try {
    // 1. Locate or verify primary SBKT factory
    let primaryFactory = await Factory.findOne({
      $or: [{ code: 'SBKT01' }, { code: 'SBKT' }, { name: /Shree Brahmanikrupa/i }],
    }).exec();

    if (!primaryFactory) {
      if (isDryRun) {
        console.log('ℹ️  No existing SBKT factory found. Would create primary factory: Shree Brahmanikrupa Textile (Code: SBKT01)');
      } else {
        primaryFactory = await Factory.create({
          name: 'Shree Brahmanikrupa Textile',
          code: 'SBKT01',
          address: 'Surat, Gujarat, India',
          city: 'Surat',
          state: 'Gujarat',
          country: 'India',
          phone: '+91-9876543210',
          email: 'admin@sbkt.com',
          status: 'ACTIVE',
          isActive: true,
        });
        console.log(`✅ Created primary factory: ${primaryFactory.name} (${primaryFactory._id})`);
      }
    } else {
      console.log(`🏢 Found primary factory: ${primaryFactory.name} (Code: ${primaryFactory.code}, ID: ${primaryFactory._id})`);
      if (!isDryRun && (!primaryFactory.city || !primaryFactory.status)) {
        primaryFactory.city = primaryFactory.city || 'Surat';
        primaryFactory.state = primaryFactory.state || 'Gujarat';
        primaryFactory.country = primaryFactory.country || 'India';
        primaryFactory.status = 'ACTIVE';
        primaryFactory.isActive = true;
        await primaryFactory.save();
        console.log('✅ Synchronized primary factory status and location fields.');
      }
    }

    const primaryFactoryId = primaryFactory?._id;

    // 2. Audit collections
    const collections = [
      { name: 'Users (Non-Super Admin)', model: User, query: { role: { $ne: 'SUPER_ADMIN' }, $or: [{ factoryId: { $exists: false } }, { factoryId: null }] } },
      { name: 'Yarn Master', model: Yarn, query: { $or: [{ factoryId: { $exists: false } }, { factoryId: null }] } },
      { name: 'Fabric Master', model: Fabric, query: { $or: [{ factoryId: { $exists: false } }, { factoryId: null }] } },
      { name: 'Beam Master', model: Beam, query: { $or: [{ factoryId: { $exists: false } }, { factoryId: null }] } },
      { name: 'Beam Loading History', model: BeamLoadingHistory, query: { $or: [{ factoryId: { $exists: false } }, { factoryId: null }] } },
      { name: 'Machine Management', model: Machine, query: { $or: [{ factoryId: { $exists: false } }, { factoryId: null }] } },
      { name: 'Production Sheets', model: ProductionSheet, query: { $or: [{ factoryId: { $exists: false } }, { factoryId: null }] } },
    ];

    console.log('\n📊 Migration Audit Report:');
    console.log('------------------------------------------------------');

    let totalPending = 0;

    for (const col of collections) {
      const count = await col.model.countDocuments(col.query).exec();
      const totalInCol = await col.model.countDocuments({}).exec();
      console.log(`• ${col.name}: ${count} unassociated records found (out of ${totalInCol} total).`);
      totalPending += count;

      if (!isDryRun && count > 0 && primaryFactoryId) {
        const updateRes = await col.model.updateMany(col.query, { $set: { factoryId: primaryFactoryId } }).exec();
        console.log(`  ↳ ✅ Successfully migrated ${updateRes.modifiedCount} records to factory ${primaryFactoryId}.`);
      }
    }

    console.log('------------------------------------------------------');
    if (isDryRun) {
      console.log(`\n🔍 Summary: ${totalPending} total unassigned records will be migrated during live execution.`);
      console.log(`Run without --dry-run to apply changes safely.`);
    } else {
      console.log(`\n🎉 Live migration complete! Total unassigned records resolved: ${totalPending}`);
    }
  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.\n');
  }
}

runMigration();
