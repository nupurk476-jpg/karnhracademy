/**
 * Starts a Razorpay payment: works out the price, records an order, and
 * asks Razorpay for an order id the browser's Checkout popup can pay.
 *
 * The browser only ever says WHAT it wants to buy. The amount comes from
 * the programme / course / note row in the database, so a crafted request
 * cannot buy anything for ₹1. Nothing here marks anything as paid — that
 * happens only in razorpay-verify or razorpay-webhook, after Razorpay's
 * signature has been checked.
 *
 * Self-contained on purpose (no shared imports) so it can be pasted into
 * the Supabase dashboard's function editor as a single file.
 *
 * Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
 * Deploy with JWT verification OFF: programme registrations don't need an
 * account, and the signed-in check below is done by hand.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const fail = (message: string, status = 400) => json({ error: message }, status);

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  // Echo the headers the browser asks about: supabase-js adds headers from
  // version to version, and one missing from a fixed list fails the whole
  // preflight with nothing more useful than a CORS error in the console.
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...CORS, "Access-Control-Allow-Headers": req.headers.get("Access-Control-Request-Headers") ?? CORS["Access-Control-Allow-Headers"] },
    });
  }
  if (req.method !== "POST") return fail("POST only", 405);

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return fail("Online payments are not set up yet.", 503);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let body: any;
  try { body = await req.json(); } catch { return fail("Invalid request"); }
  const itemType = body?.item_type;
  const itemId = body?.item_id;
  if (!["programme", "course", "note"].includes(itemType) || typeof itemId !== "string" || !UUID.test(itemId)) {
    return fail("Invalid item");
  }

  const { data: settings } = await db.from("payment_settings").select("online_payments_enabled, payee_label").maybeSingle();
  if (!settings?.online_payments_enabled) return fail("Online payments are switched off right now.", 503);

  // Who is paying. A publishable/anon key is not a user token, so getUser
  // simply fails for signed-out visitors and they stay anonymous.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  let user: { id: string; email?: string; name?: string } | null = null;
  if (token) {
    const { data } = await db.auth.getUser(token);
    if (data?.user) {
      user = {
        id: data.user.id,
        email: data.user.email,
        name: (data.user.user_metadata?.full_name ?? data.user.user_metadata?.name) as string | undefined,
      };
    }
  }

  let title = "";
  let amount = 0;
  let registrationId: string | null = null;
  let prefill: Record<string, string> = {};

  if (itemType === "course" || itemType === "note") {
    if (!user) return fail("Please sign in to buy this.", 401);

    if (itemType === "course") {
      const { data: c } = await db.from("courses").select("title, is_free, price_paise, is_published").eq("id", itemId).maybeSingle();
      if (!c || !c.is_published) return fail("Course not found", 404);
      if (c.is_free || c.price_paise < 100) return fail("This course is free.");
      title = c.title; amount = c.price_paise;
    } else {
      const { data: n } = await db.from("notes").select("title, is_free, price_paise").eq("id", itemId).maybeSingle();
      if (!n) return fail("Note not found", 404);
      if (n.is_free) return fail("This note is free.");
      if (n.price_paise < 100) return fail("This note is only available as part of a course.");
      title = n.title; amount = n.price_paise;
    }

    const { data: owned } = await db.from("purchases").select("id")
      .eq("user_id", user.id).eq("item_type", itemType).eq("item_id", itemId).maybeSingle();
    if (owned) return fail("You already own this.", 409);

    if (itemType === "note") {
      // Bought a course that contains this note? Then it is already theirs.
      const { data: inCourses } = await db.from("course_items").select("course_id").eq("kind", "note").eq("ref_id", itemId);
      const courseIds = (inCourses ?? []).map((r: any) => r.course_id);
      if (courseIds.length) {
        const { data: viaCourse } = await db.from("purchases").select("id")
          .eq("user_id", user.id).eq("item_type", "course").in("item_id", courseIds).limit(1);
        if (viaCourse?.length) return fail("You already have this note through a course you bought.", 409);
      }
    }

    prefill = { name: user.name ?? "", email: user.email ?? "" };
  } else {
    // Programme: the item is a cohort, and the registration is created here
    // (not by the browser) so its status starts at pending_payment. The
    // database trigger checks the batch is open and has seats, and sets
    // the amount from the programme's price.
    const reg = body?.registration ?? {};
    const fullName = clean(reg.full_name, 120);
    const email = clean(reg.email, 200).toLowerCase();
    const phone = clean(reg.phone, 20);
    if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !/^[0-9+\-\s]{7,20}$/.test(phone)) {
      return fail("Please fill in your name, a valid email and phone number.");
    }

    const { data: cohort } = await db.from("programme_cohorts")
      .select("batch_name, programmes(title)").eq("id", itemId).maybeSingle();
    if (!cohort) return fail("Batch not found", 404);

    const { data: created, error } = await db.from("programme_registrations").insert({
      cohort_id: itemId,
      full_name: fullName,
      email,
      phone,
      college: clean(reg.college, 200) || null,
      course: clean(reg.course, 200) || null,
      payment_method: "razorpay",
    }).select("id, amount_paise").single();
    // The trigger's messages ("This batch is full", ...) are written for
    // students, so they are passed straight through.
    if (error || !created) return fail(error?.message ?? "Could not register");

    if (created.amount_paise < 100) {
      await db.from("programme_registrations").delete().eq("id", created.id);
      return fail("This programme has no price set yet.");
    }
    registrationId = created.id;
    amount = created.amount_paise;
    title = `${(cohort as any).programmes?.title ?? "Programme"} — ${cohort.batch_name}`;
    prefill = { name: fullName, email, contact: phone };
  }

  const { data: order, error: orderErr } = await db.from("payment_orders").insert({
    user_id: user?.id ?? null,
    item_type: itemType,
    item_id: itemId,
    registration_id: registrationId,
    item_title: title,
    amount_paise: amount,
  }).select("id").single();
  if (orderErr || !order) return fail("Could not start the payment. Please try again.", 500);

  const rzp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: order.id.slice(0, 40),
      notes: { order_id: order.id, item_type: itemType, item_id: itemId },
    }),
  });
  const rzpOrder = await rzp.json().catch(() => null);
  if (!rzp.ok || !rzpOrder?.id) {
    console.error("Razorpay order create failed", rzp.status, rzpOrder);
    // Nothing can be paid against this, so don't leave a held seat or a
    // dangling order behind.
    await db.from("payment_orders").delete().eq("id", order.id);
    if (registrationId) await db.from("programme_registrations").delete().eq("id", registrationId);
    return fail("The payment provider could not start this payment. Please try again.", 502);
  }

  await db.from("payment_orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);

  return json({
    key_id: keyId,
    razorpay_order_id: rzpOrder.id,
    amount,
    currency: "INR",
    name: settings.payee_label || "Karn HR Academy",
    description: title,
    prefill,
  });
});
