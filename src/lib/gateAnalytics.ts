import { supabase } from "@/integrations/supabase/client";
import { isBot, sessionId, visitorId } from "@/lib/analytics";

/**
 * Download email gate instrumentation — one row per gate view, resolved
 * once.
 *
 * The previous shape (three independent `track()` calls: gate_shown,
 * gate_submitted, gate_dismissed) could not reconcile, because "dismissed"
 * was only ever reachable from an explicit close. Closing the tab,
 * switching apps, and the swipe-back gesture — which on mobile is most of
 * how people leave — produced a "shown" with no matching outcome, so the
 * dashboard's three numbers never summed.
 *
 * Two things here fix that:
 *
 *  1. The view is a row with a status, not three counters. It is created
 *     as 'shown' and resolved exactly once by the database (the RPC only
 *     touches rows still in 'shown'), so a beacon racing the submit
 *     handler can't turn a conversion into an abandon.
 *
 *  2. The exit listeners live at module scope, not in the component. The
 *     React dialog unmounts on navigation — the exact case we most need to
 *     record — so a listener owned by its effect would be torn down before
 *     it could fire. Module scope plus sendBeacon means the write survives
 *     both the unmount and the page going away.
 */

const OPEN_KEY = "khr_open_gate_view";

export type GateResolution = "email_given" | "walked_away";
type ResolvedVia = "submit" | "click" | "beacon";

/** The gate view currently on screen, if any. At most one ever is. */
let openViewId: string | null = null;
let listenersInstalled = false;

/**
 * Vite substitutes import.meta.env at build time; the process.env fallback
 * is for the test environment, where there is no Vite transform and the
 * values come from src/test/setup.ts.
 */
const env = (key: string): string | undefined => {
  try {
    const fromVite = (import.meta as any).env?.[key];
    if (fromVite) return fromVite as string;
    return (globalThis as any).process?.env?.[key];
  } catch {
    return undefined;
  }
};

/**
 * Restores an id stranded by a reload or a bfcache restore: the row is in
 * the table as 'shown' and nothing else will ever resolve it.
 */
function rememberOpen(id: string | null) {
  openViewId = id;
  try {
    if (id) sessionStorage.setItem(OPEN_KEY, id);
    else sessionStorage.removeItem(OPEN_KEY);
  } catch {
    // Private mode: the in-memory id still covers this pageload.
  }
}

function strandedId(): string | null {
  try {
    return sessionStorage.getItem(OPEN_KEY);
  } catch {
    return null;
  }
}

/**
 * The unload-safe write.
 *
 * sendBeacon is the only request the browser guarantees to flush once the
 * page is going away; a normal supabase-js call is an ordinary fetch and
 * is cancelled with the document. PostgREST accepts the anon key as a
 * query parameter, which matters because sendBeacon cannot set headers —
 * the key is the same public one already shipped in the bundle, so this
 * exposes nothing new. The RPC itself can only move a row from 'shown' to
 * an outcome, so a forged call can't inflate any count.
 */
function beacon(id: string, status: GateResolution): boolean {
  const url = env("VITE_SUPABASE_URL");
  const key = env("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key || typeof navigator === "undefined" || !navigator.sendBeacon) return false;
  try {
    const body = new Blob(
      [JSON.stringify({ _id: id, _status: status, _via: "beacon" })],
      { type: "application/json" },
    );
    return navigator.sendBeacon(
      `${url}/rest/v1/rpc/resolve_gate_view?apikey=${encodeURIComponent(key)}`,
      body,
    );
  } catch {
    return false;
  }
}

function resolveVia(id: string, status: GateResolution, via: ResolvedVia): void {
  if (via === "beacon" && beacon(id, status)) return;
  // Not an unload path (or no beacon support): the ordinary RPC, still
  // fire-and-forget — analytics must never throw into a click handler.
  void Promise.resolve(
    (supabase.rpc as any)("resolve_gate_view", { _id: id, _status: status, _via: via }),
  )
    .then(({ error }: any) => {
      if (error) console.debug("gate resolve failed", error.message);
    })
    .catch(() => {});
}

/**
 * Exit detection.
 *
 * visibilitychange → 'hidden' is the one signal that fires reliably for a
 * tab close, an app switch, a phone lock and a swipe-back on iOS Safari,
 * all of which beforeunload misses entirely on mobile. pagehide covers the
 * bfcache case where visibilitychange can be skipped. Both are idempotent
 * here because the RPC resolves a row only once, so double-firing is free.
 */
function installListeners() {
  if (listenersInstalled || typeof document === "undefined") return;
  listenersInstalled = true;

  const abandon = () => {
    const id = openViewId ?? strandedId();
    if (!id) return;
    rememberOpen(null);
    resolveVia(id, "walked_away", "beacon");
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") abandon();
  });
  window.addEventListener("pagehide", abandon);
}

/**
 * Called when the gate goes on screen. Returns the view id, which the
 * caller hands back to resolveGateView when the visitor decides.
 */
export function openGateView(): string | null {
  if (typeof window === "undefined" || isBot()) return null;

  // A gate already open means the previous one was replaced without an
  // outcome — count it as an abandon rather than leaving it unresolved.
  const previous = openViewId ?? strandedId();
  if (previous) resolveVia(previous, "walked_away", "click");

  const id = crypto.randomUUID();
  rememberOpen(id);
  installListeners();

  // No user_id: the gate exists precisely for people who aren't signed in.
  void Promise.resolve(
    supabase
      .from("gate_views" as any)
      .insert({
        id,
        status: "shown",
        path: window.location.pathname.slice(0, 500),
        visitor_id: visitorId(),
        session_id: sessionId(),
      } as any),
  )
    .then(({ error }: any) => {
      if (error) console.debug("gate view insert failed", error.message);
    })
    .catch(() => {});

  return id;
}

/** Called when the visitor gave an email or closed the dialog. */
export function resolveGateView(id: string | null, status: GateResolution): void {
  if (!id) return;
  if (openViewId === id || strandedId() === id) rememberOpen(null);
  resolveVia(id, status, status === "email_given" ? "submit" : "click");
}

/** Test seam. */
export function __resetGateAnalyticsForTest(): void {
  openViewId = null;
  listenersInstalled = false;
}
