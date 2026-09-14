import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Mail, Phone, CheckCircle2, ExternalLink, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CHANNEL_ICONS, CHANNEL_COLORS } from "@/components/SocialIcons";
import { LIVE_CHANNELS, CONTACT_EMAIL, PHONE_NUMBER, PHONE_DISPLAY } from "@/lib/socialLinks";
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
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Contact Us</h1>
        <p className="mb-8 text-muted-foreground">
          Have questions, feedback, or want to collaborate? Send us a message and we'll get back to you.
        </p>

        <div className="mb-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          <span className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-accent-deep" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground hover:text-accent-deep transition-colors">
              {CONTACT_EMAIL}
            </a>
          </span>
          {PHONE_NUMBER && (
            <span className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-accent-deep" />
              <a href={`tel:+${PHONE_NUMBER}`} className="text-foreground hover:text-accent-deep transition-colors">
                {PHONE_DISPLAY}
              </a>
            </span>
          )}
        </div>

        {/* ── Connect with us ─────────────────────────────────────────── */}
        <section className="mb-12" aria-labelledby="connect-heading">
          <h2 id="connect-heading" className="mb-1 text-lg font-bold text-foreground">Connect with us</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Follow for new notes, MCQs and lecture drops. Scan a QR code to open the channel on your phone —
            or <Link to="/connect" className="text-accent-deep hover:underline">get all channels on one page</Link>.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {LIVE_CHANNELS.map(c => {
              const Icon = CHANNEL_ICONS[c.key];
              const color = CHANNEL_COLORS[c.key];
              return (
                <div key={c.key} className="flex flex-col rounded-lg border border-border bg-white">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${c.cta} on ${c.label}`}
                    className="group flex items-center gap-4 p-4 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
                      <Icon width={20} height={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">{c.label}</span>
                      {c.handle && <span className="block truncate text-xs text-muted-foreground">{c.handle}</span>}
                      <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold group-hover:underline" style={{ color }}>
                        {c.cta} <ExternalLink className="h-3 w-3" />
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md border border-border p-1 transition-colors group-hover:border-accent/60">
                      <img src={`/qr/${c.key}.svg`} alt={`${c.label} QR code`} width={64} height={64} className="block" />
                    </span>
                  </a>
                  <a
                    href={`/qr/${c.key}.svg`}
                    download={`karnhr-${c.key}-qr.svg`}
                    className="inline-flex items-center gap-1 self-end px-4 pb-2.5 text-[11px] text-muted-foreground hover:text-accent-deep"
                  >
                    <QrCode className="h-3 w-3" /> Download QR
                  </a>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Click a card to open the channel. Scan or download a QR code to use on posters, PDFs and handouts.
          </p>
        </section>

        <h2 className="mb-4 text-lg font-bold text-foreground">Send a message</h2>

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
              <Link to="/privacy-policy" className="text-accent-deep hover:underline">Privacy Policy</Link>.
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
