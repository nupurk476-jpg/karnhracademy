import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Mail, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHoneypot } from "@/hooks/use-honeypot";
import { useToast } from "@/hooks/use-toast";

const ContactPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { isBot, honeypotFieldProps } = useHoneypot();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBot()) {
      // Pretend it worked — don't tip off the bot.
      setSent(true);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages" as any).insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't send your message", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    setName(""); setEmail(""); setMessage("");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact"
        description="Have questions or want to collaborate? Reach out to the Karn HR Academy team."
        path="/contact"
      />
      <Header />
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Contact Us</h1>
        <p className="mb-8 text-muted-foreground">
          Have questions, feedback, or want to collaborate? Send us a message and we'll get back to you.
        </p>

        <div className="mb-8 flex items-center gap-3">
          <Mail className="h-5 w-5 text-accent" />
          <a href="mailto:contact@karnhracademy.com" className="text-foreground hover:text-accent transition-colors">
            contact@karnhracademy.com
          </a>
        </div>

        {sent ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">Thanks — your message has been sent. We'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" {...honeypotFieldProps} />
            <div>
              <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-foreground">Message</label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
            <p className="text-xs text-muted-foreground">
              By submitting, you agree to our{" "}
              <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
