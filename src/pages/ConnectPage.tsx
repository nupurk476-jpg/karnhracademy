import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { CHANNEL_ICONS, CHANNEL_COLORS } from "@/components/SocialIcons";
import { LIVE_CHANNELS, CONTACT_EMAIL, SITE_URL, PHONE_NUMBER, PHONE_DISPLAY } from "@/lib/socialLinks";
import { ChevronRight, Globe, Mail, Phone } from "lucide-react";

// Link-in-bio page: the one URL that goes in every social bio, the WhatsApp
// "About", and the last page of every notes PDF. Deliberately no Header/Footer
// — it's a phone-first landing card, not a site page.
const ConnectPage = () => {
  const rows = [
    { key: "website", label: "Website", sub: "Notes · MCQs · PYQs · Lectures", url: SITE_URL, internal: true },
    ...LIVE_CHANNELS.map(c => ({ key: c.key, label: c.label, sub: c.handle || c.cta, url: c.url, internal: false })),
    ...(PHONE_NUMBER ? [{ key: "phone", label: "Call", sub: PHONE_DISPLAY, url: `tel:+${PHONE_NUMBER}`, internal: false }] : []),
    { key: "email", label: "Email", sub: CONTACT_EMAIL, url: `mailto:${CONTACT_EMAIL}`, internal: false },
  ];

  return (
    <div className="min-h-screen bg-[#16243F] px-4 py-10 text-white">
      <SEO
        title="Connect with Karn HR Academy"
        description="All Karn HR Academy channels in one place — YouTube, Facebook, LinkedIn, Instagram, Telegram, WhatsApp and email."
        path="/connect"
      />
      <main id="main-content" className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-3">
            <div style={{ width: 6, height: 52, background: "#C79A4B", borderRadius: 3 }} />
            <div className="text-left leading-none">
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 300, fontSize: 30, letterSpacing: -1 }}>KARN</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 30, letterSpacing: -1 }}>HR</span>
              <div style={{ fontSize: 9, letterSpacing: 5, marginTop: 6, opacity: 0.7 }}>ACADEMY</div>
            </div>
          </div>
          <p className="text-sm text-white/70">
            Free HR &amp; Management study hub for MBA, BBA and UGC NET/JRF students.
          </p>
        </div>

        <ul className="space-y-3">
          {rows.map(r => {
            const Icon = CHANNEL_ICONS[r.key] ?? Globe;
            const color = CHANNEL_COLORS[r.key] ?? "#E34234";
            const inner = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
                  {r.key === "email" ? <Mail className="h-5 w-5" strokeWidth={1.8} />
                    : r.key === "phone" ? <Phone className="h-5 w-5" strokeWidth={1.8} />
                    : <Icon width={20} height={20} />}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-bold text-[#16243F]">{r.label}</span>
                  <span className="block truncate text-xs text-[#16243F]/60">{r.sub}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#16243F]/40 transition-transform group-hover:translate-x-0.5" />
              </>
            );
            const cls = "group flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg";
            return (
              <li key={r.key}>
                {r.internal
                  ? <Link to="/" className={cls}>{inner}</Link>
                  : <a href={r.url} target={r.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={cls}>{inner}</a>}
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <div className="rounded-xl bg-white p-3">
            <img src="/qr/connect.svg" alt="QR code for this page" width={120} height={120} className="block" />
          </div>
          <p className="text-[11px] text-white/50">Scan to open this page · karnhracademy.com/connect</p>
        </div>

        <p className="mt-8 text-center text-[11px] text-white/40">
          © {new Date().getFullYear()} Karn HR Academy · <Link to="/" className="hover:text-white/70">Back to site</Link>
        </p>
      </main>
    </div>
  );
};

export default ConnectPage;
