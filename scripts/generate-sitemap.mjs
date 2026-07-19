// Runs after `vite build` (see package.json). Blog posts are published at
// runtime through the admin panel, so the hand-maintained public/sitemap.xml
// can't know about them — this appends their URLs to dist/sitemap.xml at
// deploy time, when Vercel's build environment has both network access and
// the Supabase env vars.
//
// Fail-soft by design: any error (no env vars, no network — e.g. local dev
// builds) leaves the static sitemap exactly as it was and exits 0, so the
// build never breaks over this.
import { readFileSync, writeFileSync } from "node:fs";

const SITE_URL = "https://karnhracademy.com";
const OUT = "dist/sitemap.xml";

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Vite loads .env itself, but this plain node script only sees process.env —
// fall back to parsing the repo's .env so it works in any build environment.
function envVar(name) {
  if (process.env[name]) return process.env[name];
  try {
    const match = readFileSync(".env", "utf8").match(new RegExp(`^${name}="?([^"\\n]+)"?`, "m"));
    return match?.[1];
  } catch {
    return undefined;
  }
}

try {
  const base = envVar("VITE_SUPABASE_URL");
  const key = envVar("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!base || !key) throw new Error("Supabase env vars not set");

  const res = await fetch(
    `${base}/rest/v1/blog_posts?select=slug,updated_at,created_at&published=eq.true`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`blog_posts fetch returned ${res.status}`);
  const posts = await res.json();

  let xml = readFileSync(OUT, "utf8");
  const fresh = posts.filter(
    (p) => p.slug && !xml.includes(`<loc>${SITE_URL}/blogs/${escapeXml(p.slug)}</loc>`),
  );
  if (fresh.length > 0) {
    const entries = fresh
      .map((p) => {
        const lastmod = (p.updated_at || p.created_at || "").slice(0, 10);
        return `  <url><loc>${SITE_URL}/blogs/${escapeXml(p.slug)}</loc>${
          lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
        }<changefreq>monthly</changefreq><priority>0.7</priority></url>`;
      })
      .join("\n");
    xml = xml.replace("</urlset>", `${entries}\n</urlset>`);
    writeFileSync(OUT, xml);
  }
  console.log(`sitemap: ${fresh.length} blog URL(s) appended (${posts.length} published total)`);
} catch (e) {
  console.warn(`sitemap: dynamic blog URLs skipped — ${e.message}`);
}
