// Writes one SVG QR code per live channel (plus /connect and the site itself)
// into public/qr/. Re-run after editing src/lib/socialLinks.ts:
//   node scripts/generate-qr.mjs
// Committed output, no runtime dependency — the SVGs are plain static assets.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import QRCode from "qrcode";

const src = readFileSync(new URL("../src/lib/socialLinks.ts", import.meta.url), "utf8");
const pick = (name) => src.match(new RegExp(`export const ${name} = "([^"]*)"`))?.[1] ?? "";
const WHATSAPP_NUMBER = pick("WHATSAPP_NUMBER");
const SITE_URL = pick("SITE_URL");

const PHONE_NUMBER = pick("PHONE_NUMBER");

const targets = { site: SITE_URL, connect: `${SITE_URL}/connect` };
for (const m of src.matchAll(/key: "(\w+)",[^\n]*?url: (?:"([^"]*)"|(WHATSAPP_NUMBER|PHONE_NUMBER) \? `([^`]*)`)/g)) {
  const [, key, literal, guard, tpl] = m;
  const num = guard === "WHATSAPP_NUMBER" ? WHATSAPP_NUMBER : PHONE_NUMBER;
  const url = literal ?? (num ? tpl.replace(`\${${guard}}`, num).split("?text=")[0] : "");
  if (url) targets[key] = url;
}

mkdirSync("public/qr", { recursive: true });
for (const [name, url] of Object.entries(targets)) {
  const svg = await QRCode.toString(url, {
    type: "svg", errorCorrectionLevel: "M", margin: 2,
    color: { dark: "#16243F", light: "#FFFFFF" },
  });
  writeFileSync(`public/qr/${name}.svg`, svg);
  console.log(`qr/${name}.svg ← ${url}`);
}
