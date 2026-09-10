// Sends the welcome email to someone who signed in with Google.
//
// Google sign-in produces no Supabase email at all — the address is already
// verified, so confirmation is skipped and the user lands in the app having
// heard nothing. This fills that silence.
//
// Trust model: the caller proves who they are with their own access token,
// and the address is read from the verified user record on the server. The
// request body is ignored entirely, so nobody can point this at an address
// that is not their own and use it to send mail.
//
// Deploy:  supabase functions deploy send-welcome-email
// Secrets: supabase secrets set BREVO_API_KEY=... BREVO_SENDER_EMAIL=... BREVO_SENDER_NAME="Karn HR Academy"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { welcomeEmailHtml } from "./email.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Karn HR Academy";

    if (!brevoKey || !senderEmail) {
      // Loud in the logs, quiet to the caller: a misconfigured secret is an
      // operator problem, not something to surface on a signup screen.
      console.error("Missing BREVO_API_KEY or BREVO_SENDER_EMAIL");
      return json({ error: "Email is not configured" }, 500);
    }

    // Identify the caller from their own token. Never from the body.
    const asUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await asUser.auth.getUser();
    if (userError || !user?.email) return json({ error: "Not signed in" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Claim the send before making it. The primary key on welcome_emails is
    // the lock: if this insert conflicts, someone (or another tab) already
    // has it, and we stop. Claiming first means a crash mid-send costs one
    // missed email, whereas claiming afterwards could send several.
    const provider = (user.app_metadata?.provider as string | undefined) ?? null;
    const { error: claimError } = await admin
      .from("welcome_emails")
      .insert({ user_id: user.id, provider });

    if (claimError) {
      if ((claimError as { code?: string }).code === "23505") {
        return json({ status: "already_sent" });
      }
      console.error("Could not record welcome email:", claimError.message);
      return json({ error: "Could not record welcome email" }, 500);
    }

    const name =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.display_name as string | undefined) ??
      null;

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: user.email, name: name ?? undefined }],
        replyTo: { email: "contact@karnhracademy.com", name: senderName },
        subject: "Welcome to Karn HR Academy",
        htmlContent: welcomeEmailHtml(name),
      }),
    });

    if (!brevoResponse.ok) {
      const detail = await brevoResponse.text();
      console.error("Brevo rejected the send:", brevoResponse.status, detail);
      // Release the claim so a later attempt can retry rather than the user
      // being permanently marked as welcomed by an email that never arrived.
      await admin.from("welcome_emails").delete().eq("user_id", user.id);
      return json({ error: "Could not send email" }, 502);
    }

    return json({ status: "sent" });
  } catch (err) {
    console.error("send-welcome-email failed:", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
