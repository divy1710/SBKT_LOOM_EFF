import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { isProduction } from '../config/env';

// ─── Error shape sent to clients ─────────────────────────────────────────────
interface ErrorResponseBody {
  success: false;
  message: string;
  timestamp: string;
  // Only included in non-production for operational (known) errors
  code?: number;
}

/**
 * Global error-handling middleware.
 *
 * Rules:
 * - Operational ApiErrors → expose the message and status code.
 * - Unexpected errors    → respond with a generic 500; log details server-side.
 * - Stack traces are NEVER sent to clients.
 * - Database credentials are NEVER logged (the DB module handles sanitisation).
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const timestamp = new Date().toISOString();

  // ── Operational (known) error ────────────────────────────────────────────
  if (err instanceof ApiError) {
    const body: ErrorResponseBody = {
      success: false,
      message: err.message,
      timestamp,
    };
    if (!isProduction) {
      body.code = err.statusCode;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // ── Unexpected error — log server-side, hide details from client ─────────
  const message =
    err instanceof Error ? err.message : 'An unexpected error occurred';

  console.error('❌  Unhandled error:', {
    message,
    // Never log the full stack in production JSON logs (use a log pipeline)
    stack: isProduction ? undefined : err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    message: isProduction ? 'Internal server error' : message,
    timestamp,
  } satisfies ErrorResponseBody);
};
