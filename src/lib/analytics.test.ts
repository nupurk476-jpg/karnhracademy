import { describe, it, expect, beforeEach, vi } from "vitest";

// The insert spy has to exist before analytics.ts imports the client.
const insert = vi.fn(() => Promise.resolve({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert }),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

import { track, EVENTS, __resetAnalyticsForTest } from "./analytics";

/** track() resolves through two promise ticks before it inserts. */
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  insert.mockClear();
  __resetAnalyticsForTest();
  localStorage.clear();
  sessionStorage.clear();
  Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
  Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (real browser)", configurable: true });
});

describe("track", () => {
  it("writes the event with a visitor and session id", async () => {
    track(EVENTS.PROGRAMME_VIEW, { slug: "hr-crash-course" });
    await flush();

    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(row.event).toBe("programme_view");
    expect(row.props).toEqual({ slug: "hr-crash-course" });
    expect(row.visitor_id).toBeTruthy();
    expect(row.session_id).toBeTruthy();
  });

  it("reuses the same visitor id across events but a fresh one per browser", async () => {
    track(EVENTS.SEARCH, { q: "gratuity" });
    track(EVENTS.SEARCH, { q: "bonus" });
    await flush();

    const [first, second] = insert.mock.calls.map((c) => c[0] as Record<string, unknown>);
    expect(first.visitor_id).toBe(second.visitor_id);
  });

  // The guard that keeps a GDPR/DPDP deletion request from having to reach
  // into the analytics log.
  it("drops PII-shaped keys and anything that looks like an email", async () => {
    track(EVENTS.GATE_SUBMITTED, {
      email: "student@example.com",
      full_name: "A Student",
      upi_reference: "1234567890",
      subject: "labour-welfare",
      contact: "someone@example.com",
    });
    await flush();

    const row = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(row.props).toEqual({ subject: "labour-welfare" });
  });

  it("ignores bots so conversion rates reflect humans", async () => {
    Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
    track(EVENTS.QUIZ_START, {});
    await flush();

    expect(insert).not.toHaveBeenCalled();
  });

  it("caps events per pageload so a render loop cannot flood the table", async () => {
    for (let i = 0; i < 150; i++) track(EVENTS.CONTENT_OPEN, { i });
    await flush();

    expect(insert).toHaveBeenCalledTimes(100);
  });

  it("never throws when the insert fails", async () => {
    insert.mockImplementationOnce(() => Promise.reject(new Error("network down")));
    expect(() => track(EVENTS.NEWSLETTER_SUBSCRIBE, {})).not.toThrow();
    await flush();
  });
});
