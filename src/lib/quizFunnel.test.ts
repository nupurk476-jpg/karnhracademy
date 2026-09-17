import { describe, it, expect, beforeEach, vi } from "vitest";

const insert = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert }),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

import {
  beginAttempt, currentAttemptId, endAttempt, logFunnelStep, FUNNEL_STEPS,
} from "./quizFunnel";

const flush = () => new Promise((r) => setTimeout(r, 0));

/**
 * Stands in for the table, including the constraint that does the real
 * work: UNIQUE (attempt_id, step). A repeat write is rejected here exactly
 * as Postgres rejects it.
 */
const table: { attempt_id: string; step: string }[] = [];
const seen = new Set<string>();

const RANK: Record<string, number> = { wall_hit: 1, started: 2, finished: 3, signed_up: 4 };

/**
 * analytics_summary()'s quiz_funnel block, in JS: furthest step per
 * attempt, then thresholds — with the wall and the sign-up counted exactly,
 * for the reasons the migration spells out.
 */
function funnel() {
  const furthest = new Map<string, number>();
  const wall = new Set<string>();
  const signed = new Set<string>();
  for (const row of table) {
    if (row.step === "wall_hit") wall.add(row.attempt_id);
    if (row.step === "signed_up") { signed.add(row.attempt_id); continue; }
    furthest.set(row.attempt_id, Math.max(furthest.get(row.attempt_id) ?? 0, RANK[row.step]));
  }
  const attempts = new Set(table.map(r => r.attempt_id));
  const atLeast = (n: number) => [...furthest.values()].filter(v => v >= n).length;
  return {
    attempts: attempts.size,
    started: atLeast(2),
    finished: atLeast(3),
    wall_hit: wall.size,
    signed_up: [...signed].filter(id => wall.has(id)).length,
  };
}

beforeEach(() => {
  table.length = 0;
  seen.clear();
  insert.mockReset();
  insert.mockImplementation((row: any) => {
    const key = `${row.attempt_id}:${row.step}`;
    if (seen.has(key)) return Promise.resolve({ error: { code: "23505", message: "duplicate key" } });
    seen.add(key);
    table.push(row);
    return Promise.resolve({ error: null });
  });
  sessionStorage.clear();
  localStorage.clear();
  Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
  Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (real browser)", configurable: true });
});

describe("quiz attempts", () => {
  it("keeps one attempt id across the sign-in round trip", () => {
    const first = beginAttempt("quiz-1");
    // AuthPage, after the redirect, sees the same attempt.
    expect(currentAttemptId()).toBe(first);
    // Back on the quiz page, pressing Start.
    expect(beginAttempt("quiz-1")).toBe(first);
  });

  it("mints a new attempt for a different quiz, and after a retake", () => {
    const a = beginAttempt("quiz-1");
    expect(beginAttempt("quiz-2")).not.toBe(a);
    const b = currentAttemptId();
    endAttempt();
    expect(beginAttempt("quiz-2")).not.toBe(b);
  });

  it("logs a step once per attempt however many times it is fired", async () => {
    const id = beginAttempt("quiz-1");
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: id, quizId: "quiz-1" });
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: id, quizId: "quiz-1" }); // reload
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: id, quizId: "quiz-1" }); // another reload
    await flush();

    expect(table.filter(r => r.step === "started")).toHaveLength(1);
  });

  it("logs nothing when there is no attempt in progress (a header sign-up)", async () => {
    logFunnelStep(FUNNEL_STEPS.SIGNED_UP, { attemptId: currentAttemptId() });
    await flush();
    expect(insert).not.toHaveBeenCalled();
  });

  it("ignores bots", async () => {
    Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: beginAttempt("quiz-1") });
    await flush();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("the funnel these attempts produce", () => {
  /**
   * The bug, reproduced as a set of sessions: people reload the quiz page,
   * retry the sign-up, and refresh the results screen. Under the old
   * per-event COUNT() this is exactly what pushed a downstream step above
   * the one above it.
   */
  it("never lets a step exceed the step above it, however much retrying happens", async () => {
    // Session A: hit the wall, signed up on the second try, started twice
    // (a reload), finished, then refreshed the results page.
    const a = beginAttempt("quiz-1");
    logFunnelStep(FUNNEL_STEPS.WALL_HIT, { attemptId: a });
    logFunnelStep(FUNNEL_STEPS.SIGNED_UP, { attemptId: a });
    logFunnelStep(FUNNEL_STEPS.SIGNED_UP, { attemptId: a });
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: a });
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: a });
    logFunnelStep(FUNNEL_STEPS.FINISHED, { attemptId: a });
    logFunnelStep(FUNNEL_STEPS.FINISHED, { attemptId: a });

    // Session B: hit the wall, never came back.
    endAttempt();
    const b = beginAttempt("quiz-2");
    logFunnelStep(FUNNEL_STEPS.WALL_HIT, { attemptId: b });

    // Session C: already signed in, started, abandoned mid-quiz.
    endAttempt();
    const c = beginAttempt("quiz-2");
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: c });

    await flush();

    const f = funnel();
    expect(f).toEqual({ attempts: 3, started: 2, finished: 1, wall_hit: 2, signed_up: 1 });
    // The structural guarantees, stated as the assertions they are. Under
    // the old per-event counts every one of these could be violated.
    expect(f.started).toBeLessThanOrEqual(f.attempts);
    expect(f.finished).toBeLessThanOrEqual(f.started);
    expect(f.signed_up).toBeLessThanOrEqual(f.wall_hit);
    expect(f.wall_hit).toBeLessThanOrEqual(f.attempts);
  });

  it("does not credit a sign-up that never went on to start or finish", async () => {
    // The case a "signed_up ranks last, count by threshold" funnel would
    // report as a finished quiz.
    const id = beginAttempt("quiz-1");
    logFunnelStep(FUNNEL_STEPS.WALL_HIT, { attemptId: id });
    logFunnelStep(FUNNEL_STEPS.SIGNED_UP, { attemptId: id });
    await flush();

    expect(funnel()).toEqual({ attempts: 1, started: 0, finished: 0, wall_hit: 1, signed_up: 1 });
  });

  it("counts a retake as a second attempt, not a second start on the first", async () => {
    const first = beginAttempt("quiz-1");
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: first });
    logFunnelStep(FUNNEL_STEPS.FINISHED, { attemptId: first });
    endAttempt(); // what handleRetake does
    const second = beginAttempt("quiz-1");
    logFunnelStep(FUNNEL_STEPS.STARTED, { attemptId: second });
    await flush();

    expect(funnel()).toEqual({ attempts: 2, started: 2, finished: 1, wall_hit: 0, signed_up: 0 });
  });
});
