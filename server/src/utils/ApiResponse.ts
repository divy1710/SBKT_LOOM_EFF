/**
 * ApiResponse — standardised success response wrapper.
 *
 * All successful responses follow the shape:
 * {
 *   success: true,
 *   message: string,
 *   data?: T,
 *   timestamp: ISO string
 * }
 */
export class ApiResponse<T = undefined> {
  public readonly success: true = true;
  public readonly message: string;
  public readonly data?: T;
  public readonly timestamp: string;

  constructor(message: string, data?: T) {
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  /** Serialise to a plain object for res.json() */
  toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      success: this.success,
      message: this.message,
      timestamp: this.timestamp,
    };
    if (this.data !== undefined) {
      obj['data'] = this.data;
    }
    return obj;
  }
}
