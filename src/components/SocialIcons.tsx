import type { SVGProps } from "react";
import { Globe, Mail, Phone } from "lucide-react";

// Official brand glyphs (Simple Icons paths). Lucide covers Mail/Phone/Globe
// but has no Telegram or WhatsApp, and its YouTube/Instagram/Facebook/LinkedIn
// are generic outlines that don't read as the brand at 16px.
type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true, ...p });

export const YouTubeIcon = (p: P) => (
  <svg {...base(p)}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>
);
export const InstagramIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 5.8.1 4.9.3 4.1.6c-.8.3-1.5.7-2.1 1.4C1.3 2.6.9 3.3.6 4.1.3 4.9.1 5.8.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.1 1.3.3 2.2.6 2.9.3.8.7 1.5 1.4 2.1.6.7 1.3 1.1 2.1 1.4.8.3 1.6.5 2.9.6C8.3 24 8.7 24 12 24s3.7 0 4.9-.1c1.3-.1 2.2-.3 2.9-.6.8-.3 1.5-.7 2.1-1.4.7-.6 1.1-1.3 1.4-2.1.3-.8.5-1.6.6-2.9.1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.1-1.3-.3-2.2-.6-2.9-.3-.8-.7-1.5-1.4-2.1-.6-.7-1.3-1.1-2.1-1.4-.8-.3-1.6-.5-2.9-.6C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z"/></svg>
);
export const FacebookIcon = (p: P) => (
  <svg {...base(p)}><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"/></svg>
);
export const LinkedInIcon = (p: P) => (
  <svg {...base(p)}><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.5c0 1 .8 1.8 1.8 1.8h20.4c1 0 1.8-.8 1.8-1.8V1.7C24 .8 23.2 0 22.2 0z"/></svg>
);
export const TelegramIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.6 8.2-2 9.3c-.1.7-.5.8-1.1.5l-3-2.2-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5.1c.2-.2 0-.3-.4-.1l-7 4.4-3-.9c-.7-.2-.7-.7.1-1l11.7-4.5c.5-.2 1 .1.9 1z"/></svg>
);
export const WhatsAppIcon = (p: P) => (
  <svg {...base(p)}><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5L9.1 6.9c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 0 1 2.2 12 9.8 9.8 0 0 1 12 2.2 9.8 9.8 0 0 1 21.8 12 9.8 9.8 0 0 1 12 21.8zM12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.6 0 12-5.4 12-12S18.6 0 12 0z"/></svg>
);

export const CHANNEL_ICONS: Record<string, (p: P) => JSX.Element> = {
  youtube: YouTubeIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  website: (p) => <Globe strokeWidth={1.8} {...(p as any)} />,
  email: (p) => <Mail strokeWidth={1.8} {...(p as any)} />,
  phone: (p) => <Phone strokeWidth={1.8} {...(p as any)} />,
};

// Official brand colours — used on hover so each button lights up in its own
// network's colour, the way MSG's Udemy card does.
export const CHANNEL_COLORS: Record<string, string> = {
  youtube: "#FF0000",
  instagram: "#E4405F",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  telegram: "#26A5E4",
  whatsapp: "#25D366",
  website: "#E34234",
  email: "#E34234",
  phone: "#E34234",
};

type Item = { key: string; label: string; url: string };

// MSG-style row of circular outlined icon buttons.
export const SocialIconRow = ({
  items, size = 40, onDark = false, className = "",
}: { items: Item[]; size?: number; onDark?: boolean; className?: string }) => (
  <ul className={`flex flex-wrap items-center gap-2.5 ${className}`} aria-label="Social media links">
    {items.map(item => {
      const Icon = CHANNEL_ICONS[item.key];
      const external = /^https?:/.test(item.url);
      return (
        <li key={item.key}>
          <a
            href={item.url}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            aria-label={item.label}
            title={item.label}
            className={`group inline-flex items-center justify-center rounded-full border transition-all hover:-translate-y-0.5 hover:text-white ${
              onDark
                ? "border-primary-foreground/25 text-primary-foreground/80"
                : "border-border bg-white text-foreground"
            }`}
            style={{ width: size, height: size, ["--brand" as any]: CHANNEL_COLORS[item.key] }}
            onMouseEnter={e => { e.currentTarget.style.background = CHANNEL_COLORS[item.key]; e.currentTarget.style.borderColor = CHANNEL_COLORS[item.key]; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = ""; }}
          >
            <Icon width={size * 0.45} height={size * 0.45} />
          </a>
        </li>
      );
    })}
  </ul>
);
