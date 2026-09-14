/**
 * Sends the one-off welcome email for newly created accounts.
 *
 * Runs server-side because it holds the Brevo API key. That key must never
 * reach a browser, which is why this cannot be a client-side fetch no
 * matter how much simpler that would look.
 *
 * Two properties matter more than anything else here:
 *
 *  1. It is not an open relay. The recipient is read from the
 *     welcome_emails queue, never from the request body. A caller cannot
 *     ask this function to email an arbitrary address, so the worst a
 *     leaked endpoint can do is flush a queue that was going to be sent
 *     anyway.
 *
 *  2. It sends at most once per account. user_id is the queue's primary
 *     key and sent_at is stamped before the send is acknowledged, so
 *     webhook retries and concurrent invocations cannot double-send.
 *
 * Invoke it either from a Supabase Database Webhook on
 * public.welcome_emails INSERT, or on a schedule to drain anything a
 * webhook dropped. Both are safe; both are idempotent.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { WELCOME_HTML, WELCOME_TEXT } from "./template.ts";

const SUBJECT = "Welcome to Karn HR Academy";
const SENDER = { name: "Nupur Karn", email: "nupur@karnhracademy.com" };
const REPLY_TO = { name: "Nupur Karn", email: "nupur@karnhracademy.com" };

/** One invocation drains at most this many, to stay inside the runtime's
 *  wall-clock budget and Brevo's rate limits. A webhook-driven call has
 *  one row to do; the cap only bites when draining a backlog. */
const BATCH = 25;

type QueueRow = {
  user_id: string;
  email: string;
  name: string | null;
  attempts: number;
};

/**
 * A greeting has to be a first name, not "Gagan Kumar Sharma", and not an
 * email prefix like "gk.sharma91". Falls back to "there" rather than
 * guessing, because "Hello gk.sharma91" is worse than not personalising.
 */
function firstName(name: string | null): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  // Letters only, which rules out a prefix that is really an identifier.
  // \p{M} is included because Devanagari vowel signs are Unicode marks,
  // not letters -- without it every Hindi-script name falls back.
  if (first.length < 2 || !/^[\p{L}][\p{L}\p{M}'-]*$/u.test(first)) return "there";
  return first;
}

function render(template: string, name: string | null): string {
  return template.replaceAll("{{FIRST_NAME}}", firstName(name));
}

async function sendViaBrevo(apiKey: string, row: QueueRow): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: SENDER,
      replyTo: REPLY_TO,
      to: [{ email: row.email, name: row.name ?? undefined }],
      subject: SUBJECT,
      htmlContent: render(WELCOME_HTML, row.name),
      textContent: render(WELCOME_TEXT, row.name),
    }),
  });

  if (!res.ok) {
    // Brevo's body carries the actual reason (unverified sender, quota,
    // malformed address); losing it would make this undebuggable.
    throw new Error(`brevo ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
}

Deno.serve(async (req) => {
  // A shared secret, because an unauthenticated endpoint that sends email
  // is an endpoint that will be used to send email. Set the same value as
  // a custom header on the Database Webhook.
  const expected = Deno.env.get("WELCOME_HOOK_SECRET");
  if (!expected) {
    console.error("WELCOME_HOOK_SECRET is not set; refusing to run");
    return new Response("not configured", { status: 500 });
  }
  if (req.headers.get("x-welcome-secret") !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) {
    console.error("BREVO_API_KEY is not set; refusing to run");
    return new Response("not configured", { status: 500 });
  }

  // Service role: this needs to read a table that has no policy for
  // ordinary callers, and to write sent_at.
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: pending, error } = await db
    .from("welcome_emails")
    .select("user_id, email, name, attempts")
    .is("sent_at", null)
    // Give up after a few tries so one permanently bad address cannot
    // occupy every batch forever.
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    console.error("could not read queue:", error.message);
    return new Response("queue read failed", { status: 500 });
  }

  let sent = 0;
  const failed: string[] = [];

  for (const row of (pending ?? []) as QueueRow[]) {
    // Claim the row before sending. If the send succeeds but this process
    // dies before it can record that, the alternative ordering would send
    // the same person a second welcome -- worse than missing one.
    const { data: claimed, error: claimErr } = await db
      .from("welcome_emails")
      .update({ attempts: row.attempts + 1, sent_at: new Date().toISOString() })
      .eq("user_id", row.user_id)
      .is("sent_at", null)
      .select("user_id");

    // Empty means another invocation claimed it first. Not an error.
    if (claimErr || !claimed?.length) continue;

    try {
      await sendViaBrevo(apiKey, row);
      sent += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`welcome email failed for ${row.user_id}:`, message);
      // Hand it back for a retry, keeping the incremented attempt count.
      await db
        .from("welcome_emails")
        .update({ sent_at: null, last_error: message.slice(0, 1000) })
        .eq("user_id", row.user_id);
      failed.push(row.user_id);
    }
  }

  return new Response(
    JSON.stringify({ considered: pending?.length ?? 0, sent, failed: failed.length }),
    { headers: { "content-type": "application/json" } },
  );
});
