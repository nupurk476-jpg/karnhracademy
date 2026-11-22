/**
 * Razorpay calls this when a payment is captured, independently of the
 * student's browser. It is the safety net for a student who pays and then
 * closes the tab, loses signal, or whose phone kills the browser before
 * razorpay-verify runs: they still get their purchase / confirmed seat.
 *
 * Authenticated by the X-Razorpay-Signature header: an HMAC-SHA256 of the
 * raw request body with the webhook secret you set in the Razorpay
 * dashboard. Anything that doesn't match is refused.
 *
 * Events to enable in Razorpay: payment.captured and order.paid.
 *
 * Secret: RAZORPAY_WEBHOOK_SECRET (the one typed into Razorpay's webhook
 * form — not the API key secret).
 * Deploy with JWT verification OFF: Razorpay cannot send a Supabase token.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("not configured", { status: 503 });

  // The signature covers the exact bytes Razorpay sent, so read the raw
  // text before parsing it.
  const raw = await req.text();
  const expected = await hmacHex(secret, raw);
  if (!safeEqual(expected, req.headers.get("x-razorpay-signature") ?? "")) {
    return new Response("bad signature", { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("bad body", { status: 400 }); }

  const payment = event?.payload?.payment?.entity;
  const orderId: string | undefined = event?.payload?.order?.entity?.id ?? payment?.order_id;
  const paymentId: string | undefined = payment?.id;

  const relevant = event?.event === "order.paid" || (event?.event === "payment.captured" && payment?.status === "captured");
  if (!relevant || !orderId || !paymentId) return new Response("ignored", { status: 200 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: order } = await db.from("payment_orders").select("amount_paise").eq("razorpay_order_id", orderId).maybeSingle();
  // An order this site didn't create (another app on the same Razorpay
  // account). 200 so Razorpay doesn't keep retrying it.
  if (!order) return new Response("unknown order", { status: 200 });
  if (typeof payment?.amount === "number" && payment.amount !== order.amount_paise) {
    console.error("Webhook amount mismatch", orderId, payment.amount, order.amount_paise);
    return new Response("amount mismatch", { status: 200 });
  }

  const { error } = await db.rpc("fulfil_payment_order", {
    _razorpay_order_id: orderId,
    _razorpay_payment_id: paymentId,
  });
  if (error) {
    console.error("fulfil failed", error);
    // 500 makes Razorpay retry later, which is what we want for a blip.
    return new Response("error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
