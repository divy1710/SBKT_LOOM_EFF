import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Generic request validation middleware factory.
 * Validates req.body against the supplied Zod schema.
 * On failure, throws ApiError(400) with all issue messages.
 */
export const validate =
  <T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const messages = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      return next(ApiError.badRequest(messages));
    }
    // Replace the source with the parsed (and coerced) data
    (req as Request & Record<string, unknown>)[source] = result.data;
    next();
  };

/**
 * Validate that a string is a valid MongoDB ObjectId.
 */
export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');
