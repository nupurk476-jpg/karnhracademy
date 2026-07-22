import { supabase } from "@/integrations/supabase/client";

// Every failure the app can see writes to the error_logs table (public
// insert, admin-only read — see the migration) so it's visible somewhere
// other than a devtools console nobody has open. Capped per page-load so a
// runaway error loop (e.g. a broken effect re-throwing on every render)
// can't flood the table.
const MAX_LOGS_PER_SESSION = 20;
let logged = 0;

export function logError(message: string, extra?: { stack?: string; context?: string }) {
  if (logged >= MAX_LOGS_PER_SESSION) return;
  logged += 1;
  supabase
    .from("error_logs" as any)
    .insert({
      message: message.slice(0, 2000),
      stack: extra?.stack?.slice(0, 4000) ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      context: extra?.context ?? null,
    } as any)
    .then(({ error }) => {
      if (error) console.error("error tracking insert failed", error);
    });
}

export function installGlobalErrorTracking() {
  window.addEventListener("error", (event) => {
    logError(event.message || "Unhandled error", { stack: event.error?.stack, context: "window.onerror" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    logError(message, { stack: reason instanceof Error ? reason.stack : undefined, context: "unhandledrejection" });
  });
}
