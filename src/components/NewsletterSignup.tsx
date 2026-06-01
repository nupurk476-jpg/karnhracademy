import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("email_subscribers").insert({ email: email.trim() });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already subscribed!", description: "This email is already in our list." });
      } else {
        toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    } else {
      toast({ title: "Welcome!", description: "You've joined the HR Learning Community." });
      setEmail("");
    }
  };

  return (
    <section className="bg-primary px-6 py-20">
      <div className="mx-auto max-w-xl text-center">
        <Mail className="mx-auto mb-4 h-10 w-10 text-accent" />
        <h2 className="mb-2 text-3xl font-bold text-primary-foreground">Stay Updated</h2>
        <p className="mb-8 text-primary-foreground/70">
          Join the HR Learning Community for latest notes, blogs, and quizzes.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            className="flex-1 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join the HR Learning Community"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default NewsletterSignup;
