import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Where an unsubscribe link in an email lands.
 *
 * Two decisions here are not cosmetic.
 *
 * 1. It does NOT unsubscribe on page load. Corporate mail filters and
 *    link scanners fetch every URL in an incoming message to check it,
 *    which would silently unsubscribe people who never clicked anything.
 *    A button means the action needs a real human.
 *
 * 2. The token is stripped from the address bar as soon as it is read.
 *    It would otherwise sit in browser history, in the Referer header of
 *    any outbound link, and in the path recorded by page analytics —
 *    and that token is the only credential protecting the address.
 */

type State =
  | { kind: "ready" }
  | { kind: "working" }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string };

const UnsubscribePage = () => {
  const [params] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "ready" });

  useEffect(() => {
    const t = params.get("token");
    setToken(t);
    if (t) {
      // Keep it in component state only; get it out of the URL.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [params]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "working" });
    const { data, error } = await (supabase.rpc as any)("unsubscribe_by_token", { _token: token });
    if (error) {
      setState({ kind: "error", message: "Something went wrong. Please try again, or email us and we'll remove you by hand." });
      return;
    }
    if (!data?.ok) {
      setState({ kind: "error", message: "That link isn't valid — it may already have been used, or been copied incompletely." });
      return;
    }
    setState({ kind: "done", email: data.email });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Never index an unsubscribe page. */}
      <SEO title="Unsubscribe" description="Manage your email preferences." path="/unsubscribe" noindex />
      <Header />
      <main id="main-content" className="mx-auto max-w-xl px-6 py-20">
        {state.kind === "done" ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-accent-deep" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">You've been unsubscribed</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              We won't email <strong className="text-foreground">{state.email}</strong> again.
              Everything on the site stays free and open — nothing here needs an email address.
            </p>
            <Link to="/" className="text-sm font-semibold text-accent-deep hover:underline">
              Back to Karn HR Academy
            </Link>
          </div>
        ) : !token ? (
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Link not recognised</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              This page needs the full link from your email — some mail apps cut long links in half.
              If it keeps failing, reply to any of our emails and we'll remove you by hand.
            </p>
            <Link to="/contact" className="text-sm font-semibold text-accent-deep hover:underline">
              Contact us
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Unsubscribe from emails?</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              You'll stop receiving new-material updates from Karn HR Academy. The notes, papers,
              lectures and quizzes on the site stay free and open either way.
            </p>
            <button
              onClick={confirm}
              disabled={state.kind === "working"}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
            >
              {state.kind === "working" ? "Unsubscribing…" : "Yes, unsubscribe me"}
            </button>
            {state.kind === "error" && (
              <p className="mt-4 text-sm text-destructive">{state.message}</p>
            )}
            <p className="mt-6 text-xs text-muted-foreground">
              Changed your mind? <Link to="/" className="text-accent-deep hover:underline">Go back to the site</Link>.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default UnsubscribePage;
