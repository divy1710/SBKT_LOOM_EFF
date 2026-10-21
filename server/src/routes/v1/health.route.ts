import { Router, Request, Response } from 'express';
import { isDbConnected, getDbState } from '../../config/database';
import { ApiResponse } from '../../utils/ApiResponse';

const router = Router();

const APP_NAME = 'SBKT Loom Production & Efficiency Management System';

// ─── GET /api/v1/health ───────────────────────────────────────────────────────
router.get('/', (_req: Request, res: Response): void => {
  const response = new ApiResponse('API is running', {
    application: APP_NAME,
    status: 'healthy',
    environment: process.env['NODE_ENV'] ?? 'unknown',
  });
  res.status(200).json(response.toJSON());
});

// ─── GET /api/v1/health/db ────────────────────────────────────────────────────
router.get('/db', (_req: Request, res: Response): void => {
  const connected = isDbConnected();
  const state = getDbState();

  if (connected) {
    const response = new ApiResponse('Database is connected', {
      database: 'mongodb',
      state,
      ready: true,
    });
    res.status(200).json(response.toJSON());
  } else {
    // 503 — server is alive but the database is not yet ready
    res.status(503).json({
      success: false,
      message: 'Database is not connected',
      data: {
        database: 'mongodb',
        state,
        ready: false,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
