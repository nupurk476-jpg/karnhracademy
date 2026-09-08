import { supabase } from "@/integrations/supabase/client";

/**
 * First-party product analytics — the funnel events behind revenue
 * decisions, written to our own `analytics_events` table.
 *
 * This is deliberately NOT a pageview tracker. Vercel Web Analytics counts
 * pageviews off-database; the point of this module is the handful of
 * events that Postgres can then JOIN against quiz_attempts,
 * programme_registrations and email_subscribers — questions like "do
 * quiz-takers go on to register?" that no third-party tool can answer.
 *
 * Every call is fire-and-forget: analytics must never throw into a click
 * handler, never block navigation, and never break a page when the network
 * or the table is unavailable.
 */

/** Names live here so a typo can't silently create a new event stream. */
export const EVENTS = {
  // Revenue funnel — the suspected leak is reg_payment → reg_submitted,
  // where a student has to leave for a UPI app and come back with a
  // reference number.
  PROGRAMME_VIEW: "programme_view",
  REG_DETAILS: "reg_details",
  REG_PAYMENT: "reg_payment",
  REG_SUBMITTED: "reg_submitted",
  // Quizzes gate on sign-in before the first question; this measures what
  // that wall costs.
  QUIZ_SIGNIN_REQUIRED: "quiz_signin_required",
  QUIZ_START: "quiz_start",
  QUIZ_COMPLETE: "quiz_complete",
  // Download email gate.
  GATE_SHOWN: "gate_shown",
  GATE_SUBMITTED: "gate_submitted",
  GATE_DISMISSED: "gate_dismissed",
  // Content roadmap: searches that return nothing are the backlog.
  SEARCH: "search",
  CONTENT_OPEN: "content_open",
  // Lead capture.
  NEWSLETTER_SUBSCRIBE: "newsletter_subscribe",
  AUTH_SIGNUP: "auth_signup",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

type Props = Record<string, string | number | boolean | null | undefined>;

const VISITOR_KEY = "khr_visitor_id";
const SESSION_KEY = "khr_session_id";
const UTM_KEY = "khr_first_touch";

/**
 * Matches the flood cap on error tracking, for the same reason: a bad
 * effect firing on every render must not be able to write a million rows.
 */
const MAX_EVENTS_PER_PAGELOAD = 100;
let sent = 0;

/**
 * Anything resembling personal data is dropped before it can reach the
 * table. Emails belong in email_subscribers, where a person can ask us to
 * delete them; an analytics log is the wrong place to have to honour that.
 */
const PII_KEYS = /email|phone|name|address|password|upi|reference/i;

function stripPII(props: Props): Props {
  const clean: Props = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEYS.test(key)) continue;
    if (typeof value === "string" && value.includes("@")) continue;
    clean[key] = value;
  }
  return clean;
}

/** localStorage/sessionStorage throw in some privacy modes — never fatal. */
function safeStorage(store: Storage, key: string): string {
  try {
    const existing = store.getItem(key);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    store.setItem(key, fresh);
    return fresh;
  } catch {
    // No storage: the event still counts, it just can't be tied to a
    // visitor. Better a partial row than a dropped one.
    return "anonymous";
  }
}

/**
 * Where this visitor originally came from, captured once per visit and
 * replayed onto every later event — otherwise a campaign only ever gets
 * credit for the landing page, never for the registration it produced.
 */
type FirstTouch = { referrer?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string };

function firstTouch(): FirstTouch {
  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) return JSON.parse(stored) as FirstTouch;

    const params = new URLSearchParams(window.location.search);
    const captured: FirstTouch = {
      // Same-origin referrers are just internal navigation, not a source.
      referrer: document.referrer && !document.referrer.startsWith(window.location.origin)
        ? document.referrer.slice(0, 500)
        : undefined,
      utm_source: params.get("utm_source")?.slice(0, 100) ?? undefined,
      utm_medium: params.get("utm_medium")?.slice(0, 100) ?? undefined,
      utm_campaign: params.get("utm_campaign")?.slice(0, 100) ?? undefined,
    };
    sessionStorage.setItem(UTM_KEY, JSON.stringify(captured));
    return captured;
  } catch {
    return {};
  }
}

/**
 * Headless browsers and crawlers would otherwise dominate the funnel and
 * make every conversion rate look worse than it is.
 */
function isBot(): boolean {
  if (typeof navigator === "undefined") return true;
  if (navigator.webdriver) return true;
  return /bot|crawler|spider|crawling|headless|lighthouse/i.test(navigator.userAgent);
}

/**
 * Record a product event. Safe to call from anywhere, including render
 * paths and click handlers — it resolves immediately and swallows all
 * failures.
 */
export function track(event: EventName, props: Props = {}): void {
  if (typeof window === "undefined" || isBot()) return;
  if (sent >= MAX_EVENTS_PER_PAGELOAD) return;
  sent += 1;

  const touch = firstTouch();

  // Best-effort user id: an unresolved session must not delay the write,
  // so we attach the id only if auth has already settled.
  //
  // The insert is *returned* into the outer chain rather than voided, so
  // the trailing .catch() covers a rejected insert too. Left dangling it
  // would surface as an unhandledrejection, which installGlobalErrorTracking
  // would dutifully write to error_logs — turning an analytics blip into
  // error-log spam.
  void supabase.auth.getSession().then(({ data }) => {
    return supabase
      .from("analytics_events" as any)
      .insert({
        event,
        path: window.location.pathname.slice(0, 500),
        visitor_id: safeStorage(localStorage, VISITOR_KEY),
        session_id: safeStorage(sessionStorage, SESSION_KEY),
        user_id: data.session?.user?.id ?? null,
        props: stripPII(props),
        referrer: touch.referrer ?? null,
        utm_source: touch.utm_source ?? null,
        utm_medium: touch.utm_medium ?? null,
        utm_campaign: touch.utm_campaign ?? null,
      } as any)
      .then(({ error }) => {
        // Console only. An analytics failure that reported itself through
        // logError would turn one broken table into two.
        if (error) console.debug("analytics insert failed", error.message);
      });
  }).catch(() => {});
}

/** Test seam — resets the per-pageload flood counter. */
export function __resetAnalyticsForTest(): void {
  sent = 0;
}
