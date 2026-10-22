import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { env, isDevelopment } from './config/env';
import apiV1Router from './routes/index';
import authRouter from './modules/auth/auth.routes';
import healthRouter from './routes/v1/health.route';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// ─── Trusted Origins ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS: string[] = [
  'https://sbkt-loom-eff.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.1.102:5173',
];

if (env.CLIENT_URL) {
  const normalized = env.CLIENT_URL.replace(/\/+$/, '');
  if (!ALLOWED_ORIGINS.includes(normalized)) {
    ALLOWED_ORIGINS.push(normalized);
  }
}

// ─── Build the Express App ────────────────────────────────────────────────────
export const createApp = (): Application => {
  const app = express();

  // ── CORS (must be registered FIRST before all routes and handlers) ───────────
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no Origin (same-origin, Postman, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (
        ALLOWED_ORIGINS.includes(normalizedOrigin) ||
        /^https:\/\/sbkt-loom-eff[a-z0-9-]*\.vercel\.app$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'X-SBKT-Backup-Format', 'X-SBKT-Total-Records'],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── Cookie parser (required for HttpOnly JWT cookie auth) ─────────────────
  app.use(cookieParser(env.COOKIE_SECRET));

  // ── Request logging ─────────────────────────────────────────────────────────
  app.use(morgan(isDevelopment ? 'dev' : 'combined'));

  // ── Body parsing ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Global rate limiting ────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,                  // requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests — please try again later.',
      timestamp: new Date().toISOString(),
    },
  });
  app.use('/api', limiter);

  // ── API routes ─────────────────────────────────────────────────────────────
  app.use('/api/v1', apiV1Router);
  app.use('/api', apiV1Router);
  app.use('/auth', authRouter);
  app.use('/health', healthRouter);

  // ── 404 — must come AFTER all routes ──────────────────────────────────────
  app.use(notFoundHandler);

  // ── Global error handler — must be LAST and have 4 parameters ─────────────
  app.use(errorHandler);

  return app;
};
