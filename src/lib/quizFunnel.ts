import { supabase } from "@/integrations/supabase/client";
import { isBot, sessionId, visitorId } from "@/lib/analytics";

/**
 * Quiz funnel, keyed by attempt.
 *
 * The old funnel counted four unrelated events, so every reload of a quiz
 * page, every retake and every second trip through /auth added another row
 * to a step further down without adding one to the step above it. That is
 * how the dashboard came to show "signed up" at 120% of "finished".
 *
 * Here an attempt gets one id, minted when the visitor first tries to take
 * a quiz and kept across the sign-in round trip, and each step is logged
 * against it at most once — enforced by a unique (attempt_id, step) in the
 * database rather than by the browser remembering not to.
 */

const ATTEMPT_KEY = "khr_quiz_attempt";
/**
 * Long enough to cover the sign-in round trip (including the Google
 * redirect and a confirmation email opened in another tab), short enough
 * that coming back tomorrow is a new attempt rather than a resumed one.
 */
const ATTEMPT_TTL_MS = 2 * 60 * 60 * 1000;

export const FUNNEL_STEPS = {
  WALL_HIT: "wall_hit",
  STARTED: "started",
  FINISHED: "finished",
  SIGNED_UP: "signed_up",
} as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[keyof typeof FUNNEL_STEPS];

type Attempt = { id: string; quizId: string; at: number };

function read(): Attempt | null {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attempt;
    if (!parsed?.id || Date.now() - parsed.at > ATTEMPT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(attempt: Attempt | null) {
  try {
    if (attempt) sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    else sessionStorage.removeItem(ATTEMPT_KEY);
  } catch {
    // Private mode: steps still log, they just can't be stitched across a
    // navigation. A split attempt undercounts; it never inflates.
  }
}

/**
 * The id for the attempt in progress on this quiz, minting one if there
 * isn't a live one already.
 *
 * Reusing the stored id is what makes the sign-in wall part of the same
 * attempt as the quiz the visitor comes back to — and what makes a plain
 * page reload re-log 'started' against the same attempt, where the unique
 * constraint discards it.
 */
export function beginAttempt(quizId: string): string {
  const existing = read();
  if (existing && existing.quizId === quizId) {
    return existing.id;
  }
  const id = crypto.randomUUID();
  write({ id, quizId, at: Date.now() });
  return id;
}

/** The live attempt id, if any — for steps that happen off the quiz page. */
export function currentAttemptId(): string | null {
  return read()?.id ?? null;
}

/**
 * Ends the attempt without logging anything. Used by "Retake", so the next
 * run is a genuinely new attempt and its 'started' is not swallowed by the
 * unique constraint on the previous one.
 */
export function endAttempt(): void {
  write(null);
}

/**
 * Log one step of one attempt. Safe to call twice — the duplicate is
 * rejected by the database, which is the point.
 */
export function logFunnelStep(
  step: FunnelStep,
  opts: { attemptId?: string | null; quizId?: string | null } = {},
): void {
  if (typeof window === "undefined" || isBot()) return;
  const attemptId = opts.attemptId ?? currentAttemptId();
  if (!attemptId) return;

  void supabase.auth.getSession().then(({ data }) => {
    return supabase
      .from("funnel_events" as any)
      .insert({
        attempt_id: attemptId,
        step,
        quiz_id: opts.quizId ?? null,
        visitor_id: visitorId(),
        session_id: sessionId(),
        user_id: data.session?.user?.id ?? null,
      } as any)
      .then(({ error }: any) => {
        // 23505 is the unique violation — a reload or retry logging a step
        // this attempt already reached. That is the constraint doing its
        // job, not a failure.
        if (error && error.code !== "23505") {
          console.debug("funnel insert failed", error.message);
        }
      });
  }).catch(() => {});
}
