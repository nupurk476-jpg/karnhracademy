import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const redirectTo = (location.state as any)?.from || "/quizzes";

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
      />
      <Header />
      <main className="mx-auto max-w-md px-6 py-20">
        <div className="rounded-lg border border-border bg-card p-8">
          <h1 className="mb-6 text-2xl font-bold text-foreground">
            {isLogin ? "Sign In" : "Create Account"}
          </h1>
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
                className="text-sm text-accent hover:underline"
              >
                Forgot password?
              </button>
            )}
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-accent hover:underline"
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
