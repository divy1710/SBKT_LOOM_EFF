import http from 'http';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { createApp } from './app';

const APP_NAME = 'SBKT Loom Production & Efficiency Management System';

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const bootstrap = async (): Promise<void> => {
  const app = createApp();
  const server = http.createServer(app);

  // Start HTTP server before awaiting DB so the health endpoint is reachable
  // even when MongoDB is temporarily unavailable.
  server.listen(env.PORT, '0.0.0.0', () => {
    console.log('');
    console.log(`🚀  ${APP_NAME}`);
    console.log(`🌐  HTTP server listening on port ${env.PORT} (0.0.0.0)`);
    console.log(`📡  API base: http://localhost:${env.PORT}/api/v1`);
    console.log(`🔧  Environment: ${env.NODE_ENV}`);
    console.log('');
  });

  // Attempt DB connection (non-blocking — failures are logged, not fatal)
  await connectDatabase();

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n🛑  ${signal} received — shutting down gracefully…`);

    server.close(async () => {
      console.log('🔌  HTTP server closed');
      await disconnectDatabase();
      console.log('👋  Shutdown complete');
      process.exit(0);
    });

    // Force-exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('⏰  Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Catch unhandled promise rejections — log and exit so the process manager
  // can restart with a clean state.
  process.on('unhandledRejection', (reason) => {
    console.error('💥  Unhandled promise rejection:', reason);
    void shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    console.error('💥  Uncaught exception:', err.message);
    void shutdown('uncaughtException');
  });
};

// ─── Run ─────────────────────────────────────────────────────────────────────
bootstrap().catch((err: unknown) => {
  console.error(
    '❌  Failed to start server:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
