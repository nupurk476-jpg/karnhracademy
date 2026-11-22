/**
 * Confirms a payment the moment Razorpay Checkout reports success in the
 * browser, so the student gets access straight away.
 *
 * The browser's word is not trusted. It hands over three values; this
 * function checks Razorpay's HMAC signature over them with the key secret
 * (which only the server has), then asks Razorpay directly whether the
 * payment really belongs to that order, for that amount, and has been
 * captured — capturing it if it is only authorised. Only then is the order
 * fulfilled.
 *
 * razorpay-webhook does the same fulfilment from Razorpay's side, for the
 * student who pays and closes the tab before this call lands. Both go
 * through fulfil_payment_order, which is idempotent, so either order of
 * arrival gives exactly one purchase.
 *
 * Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
 * Deploy with JWT verification OFF (anonymous programme registrations
 * call this too; the signature is the authentication).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time, so the comparison doesn't leak how many leading
// characters of a forged signature were right.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  // Echo the headers the browser asks about: supabase-js adds headers from
  // version to version, and one missing from a fixed list fails the whole
  // preflight with nothing more useful than a CORS error in the console.
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...CORS, "Access-Control-Allow-Headers": req.headers.get("Access-Control-Request-Headers") ?? CORS["Access-Control-Allow-Headers"] },
    });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return json({ error: "Online payments are not set up yet." }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const orderId = String(body?.razorpay_order_id ?? "");
  const paymentId = String(body?.razorpay_payment_id ?? "");
  const signature = String(body?.razorpay_signature ?? "");
  if (!orderId || !paymentId || !signature) return json({ error: "Missing payment details" }, 400);

  const expected = await hmacHex(keySecret, `${orderId}|${paymentId}`);
  if (!safeEqual(expected, signature)) return json({ error: "Payment could not be verified." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: order } = await db.from("payment_orders").select("amount_paise, status").eq("razorpay_order_id", orderId).maybeSingle();
  if (!order) return json({ error: "Unknown order" }, 404);

  if (order.status !== "paid") {
    const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
    const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: auth } });
    let payment = await res.json().catch(() => null);
    if (!res.ok || !payment || payment.order_id !== orderId || payment.amount !== order.amount_paise) {
      console.error("Payment/order mismatch", orderId, paymentId, payment);
      return json({ error: "Payment could not be verified." }, 400);
    }
    // Accounts with automatic capture switched off leave payments merely
    // authorised; Razorpay refunds those after a few days. Capture it now
    // rather than hand out access for money that will bounce back.
    if (payment.status === "authorized") {
      const cap = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: order.amount_paise, currency: "INR" }),
      });
      payment = await cap.json().catch(() => null);
      if (!cap.ok) console.error("Capture failed", paymentId, payment);
    }
    if (payment?.status !== "captured") {
      return json({ error: "Your payment is still processing. Access will unlock automatically once it completes." }, 202);
    }
  }

  const { data, error } = await db.rpc("fulfil_payment_order", {
    _razorpay_order_id: orderId,
    _razorpay_payment_id: paymentId,
  });
  if (error) {
    console.error("fulfil failed", error);
    return json({ error: "Payment received but we couldn't record it. Please contact us." }, 500);
  }
  return json(data);
});
