/**
 * ApiError — operational error class that carries an HTTP status code.
 *
 * Use this to signal known, user-facing errors (400, 401, 403, 404, 409, etc.).
 * The global error handler will serialise these into the standard error shape:
 * {
 *   success: false,
 *   message: string,
 *   timestamp: ISO string
 * }
 *
 * Stack traces and internal details are NEVER sent to the client.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintains proper prototype chain in compiled JS
    Object.setPrototypeOf(this, ApiError.prototype);

    // Capture a clean stack trace (skipping the ApiError constructor frame)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /** Factory helpers for common status codes */
  static badRequest(message: string): ApiError {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }

  static internalServer(message = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable'): ApiError {
    return new ApiError(503, message);
  }
}
