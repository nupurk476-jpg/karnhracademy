/**
 * Typed application errors so route handlers and server actions can return
 * consistent, safe messages without leaking internals.
 */

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "ai_unavailable"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 400,
  conflict: 409,
  rate_limited: 429,
  ai_unavailable: 503,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export function toSafeMessage(err: unknown): { code: ErrorCode; message: string; status: number } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, status: err.status };
  }
  return { code: "internal", message: "Something went wrong. Please try again.", status: 500 };
}

/** Result envelope used by server actions (never throw across the RSC boundary). */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ErrorCode };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = undefined>(error: string, code?: ErrorCode): ActionResult<T> {
  return { ok: false, error, code };
}
