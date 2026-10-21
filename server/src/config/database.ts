import mongoose from 'mongoose';
import { env } from './env';

// ─── Connection state helpers ─────────────────────────────────────────────────
export const isDbConnected = (): boolean =>
  mongoose.connection.readyState === 1;

export const getDbState = (): string => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };
  return states[mongoose.connection.readyState] ?? 'unknown';
};

// ─── Connect ─────────────────────────────────────────────────────────────────
export const connectDatabase = async (): Promise<void> => {
  // Redact credentials from logged URI
  const safeUri = env.MONGODB_URI.replace(/:\/\/[^@]*@/, '://<credentials>@');

  mongoose.connection.on('connected', () => {
    console.log(`✅  MongoDB connected → ${safeUri}`);
  });

  mongoose.connection.on('error', (err: Error) => {
    console.error(`❌  MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️   MongoDB disconnected');
  });

  try {
    await mongoose.connect(env.MONGODB_URI, {
      // Let Mongoose use its built-in reconnect logic (single attempt here;
      // the 'error' event handles subsequent failures)
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌  Initial MongoDB connection failed: ${message}`);
    // Do NOT exit — allow the HTTP server to start so health checks can
    // report the database as unavailable.
  }
};

// ─── Graceful shutdown ────────────────────────────────────────────────────────
export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('🔌  MongoDB connection closed gracefully');
  }
};
