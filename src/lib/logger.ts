/**
 * Minimal structured logger. JSON lines in production (easy to ship to any
 * log drain), human-readable in development.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel: Level =
  (process.env.LOG_LEVEL as Level) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  if (process.env.NODE_ENV === "production") {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      scope,
      message,
      ...meta,
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`[${level.toUpperCase()}] ${scope}: ${message}`, meta ?? "");
  }
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) => emit("debug", scope, message, meta),
    info: (message: string, meta?: Record<string, unknown>) => emit("info", scope, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => emit("warn", scope, message, meta),
    error: (message: string, meta?: Record<string, unknown>) => emit("error", scope, message, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
