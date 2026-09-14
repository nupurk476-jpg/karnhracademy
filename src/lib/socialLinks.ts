// Single source of truth for every public channel. Leave `url` empty for a
// channel that isn't live yet — it is skipped everywhere (footer, contact,
// /connect, schema sameAs, QR generation) until filled in.

export type SocialChannel = {
  key: string;
  label: string;
  handle: string;
  url: string;
  cta: string;
};

export const SITE_URL = "https://karnhracademy.com";
export const CONTACT_EMAIL = "nupur@karnhracademy.com";

// Digits only, with country code — e.g. "919876543210". Empty = hidden.
export const WHATSAPP_NUMBER = "919082753396";
export const PHONE_NUMBER = "919082753396";

const WHATSAPP_PRESET = encodeURIComponent("Hi Karn HR Academy, I have a question about ");

// "919082753396" → "+91 90827 53396"
export const PHONE_DISPLAY = PHONE_NUMBER
  ? `+${PHONE_NUMBER.slice(0, 2)} ${PHONE_NUMBER.slice(2, 7)} ${PHONE_NUMBER.slice(7)}`
  : "";

export const SOCIAL_CHANNELS: SocialChannel[] = [
  { key: "youtube",   label: "YouTube",   handle: "@KarnHRAcademy",  url: "https://www.youtube.com/@KarnHRAcademy", cta: "Subscribe" },
  { key: "instagram", label: "Instagram", handle: "@karn.hracademy",  url: "https://www.instagram.com/karn.hracademy/", cta: "Follow" },
  { key: "facebook",  label: "Facebook",  handle: "Karn HR Academy",  url: "https://www.facebook.com/profile.php?id=61594424482330", cta: "Follow" },
  { key: "linkedin",  label: "LinkedIn",  handle: "Karn HR Academy",  url: "https://www.linkedin.com/company/136804079/", cta: "Follow" },
  { key: "telegram",  label: "Telegram",  handle: PHONE_DISPLAY,      url: PHONE_NUMBER ? `https://t.me/+${PHONE_NUMBER}` : "", cta: "Message" },
  { key: "whatsapp",  label: "WhatsApp",  handle: PHONE_DISPLAY, url: WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_PRESET}` : "", cta: "Chat" },
];

export const LIVE_CHANNELS = SOCIAL_CHANNELS.filter(c => c.url);

// For JSON-LD Organization.sameAs — profile URLs only, no chat/phone links.
export const SAME_AS = LIVE_CHANNELS.filter(c => c.key !== "whatsapp").map(c => c.url);
