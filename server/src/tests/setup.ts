/**
 * Test setup file.
 *
 * Loads environment variables from .env.test before any test runs.
 * Uses a dedicated test database so production/dev data is never touched.
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

// Fallback for CI where .env.test may not exist
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = process.env['PORT'] ?? '5001';
process.env['CLIENT_URL'] = process.env['CLIENT_URL'] ?? 'http://localhost:5173';
process.env['MONGODB_URI'] = process.env['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017/sbkt_loom_test';
process.env['JWT_SECRET'] = process.env['JWT_SECRET'] ?? 'test_jwt_secret_key_for_testing_only_minimum_32_chars';
process.env['JWT_EXPIRES_IN'] = process.env['JWT_EXPIRES_IN'] ?? '15m';
process.env['COOKIE_SECRET'] = process.env['COOKIE_SECRET'] ?? 'test_cookie_secret_for_testing_only_minimum_32chars';
process.env['BOOTSTRAP_ENABLED'] = 'false';

beforeAll(async () => {
  const uri = process.env['MONGODB_URI']!;
  await mongoose.connect(uri);
});

afterEach(async () => {
  // Clean all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key]!.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
