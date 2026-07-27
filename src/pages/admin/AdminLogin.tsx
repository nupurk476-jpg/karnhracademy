import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-8">
        <div className="flex items-center gap-2 text-foreground">
          <LogIn className="h-5 w-5 text-accent-deep" />
          <h1 className="text-xl font-bold">Admin Login</h1>
        </div>
        <div>
          <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-foreground">Email</label>
          <input
            id="admin-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-foreground">Password</label>
          <input
            id="admin-password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
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
      </form>
    </div>
  );
};

export default AdminLogin;
