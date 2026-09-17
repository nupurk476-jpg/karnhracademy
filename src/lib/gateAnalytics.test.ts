import { describe, it, expect, beforeEach, vi } from "vitest";

const insert = vi.fn((_row: any) => Promise.resolve({ error: null as any }));
const rpc = vi.fn((_name: string, _args: any) => Promise.resolve({ error: null as any }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert }),
    rpc: (...args: unknown[]) => (rpc as any)(...args),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

import { openGateView, resolveGateView, __resetGateAnalyticsForTest } from "./gateAnalytics";

const flush = () => new Promise((r) => setTimeout(r, 0));

/**
 * The store the browser would keep: a gate view is one row, resolved once.
 * Mirrors resolve_gate_view's `WHERE status = 'shown'` guard, which is what
 * makes a racing beacon harmless.
 */
type Row = { id: string; status: string; via?: string };
const rows = new Map<string, Row>();

function applyInsert(args: any) {
  rows.set(args.id, { id: args.id, status: args.status });
}
function applyResolve(args: any) {
  const row = rows.get(args._id);
  if (row && row.status === "shown") {
    row.status = args._status;
    row.via = args._via;
  }
}

beforeEach(() => {
  rows.clear();
  insert.mockClear();
  rpc.mockClear();
  insert.mockImplementation((args: any) => { applyInsert(args); return Promise.resolve({ error: null }); });
  rpc.mockImplementation((_name: string, args: any) => { applyResolve(args); return Promise.resolve({ error: null }); });

  __resetGateAnalyticsForTest();
  sessionStorage.clear();
  localStorage.clear();
  Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
  Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (real browser)", configurable: true });
  // No sendBeacon in jsdom by default; the RPC fallback path is what runs.
  (navigator as any).sendBeacon = undefined;
});

const tally = () => ({
  shown: rows.size,
  email_given: [...rows.values()].filter(r => r.status === "email_given").length,
  walked_away: [...rows.values()].filter(r => r.status === "walked_away").length,
  unresolved: [...rows.values()].filter(r => r.status === "shown").length,
});

describe("gate views", () => {
  it("writes one row per view, starting as shown", async () => {
    const id = openGateView();
    await flush();

    expect(id).toBeTruthy();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(rows.get(id!)!.status).toBe("shown");
  });

  it("resolves a view exactly once — a later abandon cannot undo a conversion", async () => {
    const id = openGateView();
    resolveGateView(id, "email_given");
    resolveGateView(id, "walked_away"); // e.g. the dialog's close handler firing after submit
    await flush();

    expect(rows.get(id!)!.status).toBe("email_given");
  });

  it("records an abandon when the tab is hidden, without any close click", async () => {
    const id = openGateView();
    await flush();

    // The exact exit the old gate_dismissed event could never see.
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();

    expect(rows.get(id!)!.status).toBe("walked_away");
    expect(rows.get(id!)!.via).toBe("beacon");
  });

  it("still records the abandon when the component has unmounted", async () => {
    // Nothing here holds a React ref — the listeners are module-scope,
    // which is the whole reason a swipe-back gets counted.
    const id = openGateView();
    await flush();
    window.dispatchEvent(new Event("pagehide"));
    await flush();

    expect(rows.get(id!)!.status).toBe("walked_away");
  });

  it("uses sendBeacon on the exit path when the browser has it", async () => {
    // sendBeacon can't set headers, so the anon key rides as a query
    // parameter — the same public key already in the bundle (see
    // src/test/setup.ts for the test values).
    const sendBeacon = vi.fn((_url: string, _body: unknown) => true);
    (navigator as any).sendBeacon = sendBeacon;
    openGateView();
    await flush();
    window.dispatchEvent(new Event("pagehide"));
    await flush();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url] = sendBeacon.mock.calls[0] as unknown as [string];
    expect(url).toContain("/rest/v1/rpc/resolve_gate_view");
    // Asserted against whatever key the environment actually supplies, not
    // a hardcoded one: a .env.local in the working tree overrides the value
    // src/test/setup.ts falls back to, and the point of the assertion is
    // that the key is on the query string at all — sendBeacon cannot send
    // it as a header.
    expect(url).toContain(`apikey=${encodeURIComponent(process.env.VITE_SUPABASE_PUBLISHABLE_KEY!)}`);
    // The beacon carried the write, so no duplicate through the RPC.
    expect(rpc).not.toHaveBeenCalled();
  });

  it("counts a view replaced by another as an abandon, never as a second shown", async () => {
    const first = openGateView();
    const second = openGateView();
    await flush();

    expect(rows.get(first!)!.status).toBe("walked_away");
    expect(rows.get(second!)!.status).toBe("shown");
  });

  it("reconciles: shown = email_given + walked_away + unresolved", async () => {
    // Four simulated sessions, one of each way out plus one still open.
    const gave = openGateView();
    resolveGateView(gave, "email_given");

    const cancelled = openGateView();
    resolveGateView(cancelled, "walked_away");

    openGateView(); // leaves via the tab
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    openGateView(); // still on screen
    await flush();

    const t = tally();
    expect(t).toEqual({ shown: 4, email_given: 1, walked_away: 2, unresolved: 1 });
    expect(t.email_given + t.walked_away + t.unresolved).toBe(t.shown);
  });

  it("does not open a view for a bot", async () => {
    Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
    expect(openGateView()).toBeNull();
    await flush();
    expect(insert).not.toHaveBeenCalled();
  });
});
