import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { env, isDevelopment } from './config/env';
import apiV1Router from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// ─── Trusted Origins ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS: string[] = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.1.102:5173',
  env.CLIENT_URL,
];

// Deduplicate (CLIENT_URL may already match one of the above)
const uniqueOrigins = [...new Set(ALLOWED_ORIGINS)];

// ─── Build the Express App ────────────────────────────────────────────────────
export const createApp = (): Application => {
  const app = express();

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── Cookie parser (required for HttpOnly JWT cookie auth) ─────────────────
  app.use(cookieParser(env.COOKIE_SECRET));

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no Origin (same-origin, Postman, curl in dev)
        if (!origin) {
          return callback(null, true);
        }
        if (uniqueOrigins.includes(origin)) {
          return callback(null, true);
        }
        // Reject with null (cors will omit the ACAO header).
        // We return null rather than an Error so Express does NOT generate a
        // 500 and does NOT echo the disallowed origin back to the client.
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

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

  // ── 404 — must come AFTER all routes ──────────────────────────────────────
  app.use(notFoundHandler);

  // ── Global error handler — must be LAST and have 4 parameters ─────────────
  app.use(errorHandler);

  return app;
};
