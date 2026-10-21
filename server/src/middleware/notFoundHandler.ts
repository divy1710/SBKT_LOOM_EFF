import { Request, Response } from 'express';

/**
 * Catch-all 404 handler.
 *
 * Mounted AFTER all valid routes so that any unmatched request reaches here.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
};
