import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Asks the server to send the welcome email to someone who signed in with an
 * OAuth provider.
 *
 * Google sign-in produces no Supabase email — the address is already verified,
 * so confirmation is skipped and the user arrives having heard nothing. Email
 * and password signups are not handled here: those already get the welcome as
 * part of Supabase's confirmation email.
 *
 * Mounted once, at the app root, because OAuth returns to the site root rather
 * than to the page the user started on — a listener living on the auth page
 * would never hear it.
 *
 * Nothing here decides whether an email is actually sent. It asks; the Edge
 * Function identifies the caller from their own token, reads the address from
 * the verified user record, and refuses a second send. This is a prompt, not
 * an instruction, which is why it is safe for it to fire more than once.
 */
export function useWelcomeEmail() {
  // SIGNED_IN fires on every sign-in and on tab focus in some cases. This
  // keeps one browser session from firing a burst of no-op requests; the real
  // guard is the primary key on welcome_emails, server-side.
  const asked = useRef<Set<string>>(new Set());

  useEffect(() => {
    const maybeSend = async (session: { user: { id: string; app_metadata?: Record<string, unknown> } } | null) => {
      if (!session?.user) return;

      const provider = session.user.app_metadata?.provider as string | undefined;
      // "email" means password signup, which Supabase already emails.
      if (!provider || provider === "email") return;

      if (asked.current.has(session.user.id)) return;
      asked.current.add(session.user.id);

      try {
        await supabase.functions.invoke("send-welcome-email");
      } catch {
        // A welcome email is not worth interrupting a successful sign-in over.
        // The failure is logged server-side, where someone can act on it.
      }
    };

    // Covers the OAuth redirect landing, and a returning user's restored session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") maybeSend(session as any);
    });

    return () => subscription.unsubscribe();
  }, []);
}
