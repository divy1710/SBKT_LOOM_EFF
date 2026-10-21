/**
 * Type definitions for the SBKT application.
 *
 * This file is intentionally sparse in Phase 1.
 * Business domain types (Machine, Beam, ProductionSheet, etc.)
 * will be added in subsequent phases.
 */

// ─── API Response Shapes ──────────────────────────────────────────────────────
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  timestamp: string;
  code?: number;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Common helpers ───────────────────────────────────────────────────────────
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
