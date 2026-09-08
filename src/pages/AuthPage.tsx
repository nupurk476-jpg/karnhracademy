import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { track, EVENTS } from "@/lib/analytics";
import { safeInternalPath } from "@/lib/safePath";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  // Gated flows pass the page they came from; a direct header sign-in goes
  // home rather than to an arbitrary section. An OAuth round trip loses
  // router state, so the destination comes back as ?next= instead — always
  // through safeInternalPath, since a URL parameter is attacker-reachable
  // in a way navigation state is not.
  const redirectTo = safeInternalPath((location.state as any)?.from ?? params.get("next"));

  /**
   * Land here after a Google round trip.
   *
   * The Supabase client consumes the code from the URL itself
   * (detectSessionInUrl), so this only has to notice the resulting session
   * and move the visitor on to wherever they were originally going.
   */
  useEffect(() => {
    if (!params.get("next")) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (cancelled || !user) return;
      // Approximate, and deliberately so: Supabase does not tell the client
      // "this account is new". An account created seconds ago is one that
      // was just made, which is accurate enough to keep signup_sources
      // honest without inventing a second source of truth.
      const isNew = Date.now() - new Date(user.created_at).getTime() < 60_000;
      if (isNew) track(EVENTS.AUTH_SIGNUP, { from: redirectTo, method: "google" });
      navigate(redirectTo, { replace: true });
    });
    return () => { cancelled = true; };
  }, [params, redirectTo, navigate]);

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Always return to /auth, never straight to the destination: it
        // keeps the Supabase redirect allow-list to a single entry, and
        // gives one place to record the signup and forward the visitor.
        redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setLoading(false);
      toast({ title: "Couldn't start Google sign-in", description: error.message, variant: "destructive" });
    }
    // On success the browser leaves for Google; nothing after this runs.
  };

  // Translate raw Supabase auth errors into messages a student can act on.
  const friendlyAuthError = (message: string): { title: string; description: string } => {
    const m = message.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered"))
      return { title: "This email already has an account", description: "Please sign in instead. Use “Forgot password?” if you don't remember it." };
    if (m.includes("invalid login credentials"))
      return { title: "Wrong email or password", description: "Check your details and try again, or use “Forgot password?”." };
    if (m.includes("email not confirmed"))
      return { title: "Email not confirmed yet", description: "Open the confirmation link we emailed you, then sign in." };
    if (m.includes("signups not allowed") || m.includes("signup is disabled"))
      return { title: "Sign-ups are temporarily closed", description: "New registrations are disabled right now. Please try again later." };
    if (m.includes("sending confirmation") || m.includes("confirmation mail") || m.includes("error sending"))
      return { title: "We couldn't send the confirmation email", description: "Your account wasn't created. Please try again later — if this keeps happening, contact us via the Contact page." };
    if (m.includes("rate limit") || m.includes("too many requests"))
      return { title: "Too many attempts", description: "Please wait a few minutes and try again." };
    if (m.includes("at least 6 characters") || m.includes("password should"))
      return { title: "Password too short", description: "Use at least 6 characters." };
    if (m.includes("database error"))
      return { title: "Server problem while creating your account", description: "Please try again later — if this keeps happening, contact us via the Contact page." };
    return { title: "Something went wrong", description: message };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        navigate(redirectTo);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // Supabase quirk: signing up an already-registered email returns a
        // fake user with no identities instead of an error.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast({
            title: "This email already has an account",
            description: "Please sign in instead. Use “Forgot password?” if you don't remember it.",
            variant: "destructive",
          });
          setIsLogin(true);
          return;
        }
        // Only past the already-registered check, so a re-signup attempt is
        // never counted as a new account. `from` records what drove it --
        // the quiz sign-in wall and the PYQ viewer are the two gates that
        // push people here, and this is what shows whether they convert.
        track(EVENTS.AUTH_SIGNUP, { from: redirectTo });
        if (data.session) {
          // Email confirmation is disabled — the user is signed in already.
          toast({ title: "Account created — welcome!" });
          navigate(redirectTo);
          return;
        }
        toast({ title: "Almost done — check your email", description: "We sent you a confirmation link. Click it to activate your account, then sign in." });
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const friendly = friendlyAuthError(err?.message || String(err));
      toast({ ...friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sign In"
        description="Sign in or create a free account to save your quiz results, rate quizzes, and comment on blog posts."
        path="/auth"
        noindex
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-md px-6 py-20">
        <div className="rounded-lg border border-border bg-card p-8">
          <h1 className="mb-6 text-2xl font-bold text-foreground">
            {isLogin ? "Sign In" : "Create Account"}
          </h1>
          {/* Google's mark, per their branding guidance: the four-colour G
              on a white button, never recoloured. */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name for the leaderboard"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
            {isLogin && (
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast({ title: "Enter your email first", variant: "destructive" });
                    return;
                  }
                  setLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  setLoading(false);
                  if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                  else toast({ title: "Check your email for a password reset link." });
                }}
                className="text-sm text-accent-deep hover:underline"
              >
                Forgot password?
              </button>
            )}
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-accent-deep hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
