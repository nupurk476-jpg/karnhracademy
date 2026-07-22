// Runs after `vite build` (see package.json). This is a pure client-side
// SPA (see src/main.tsx — createRoot, not SSR), so every page's real title/
// description/OG/Twitter tags are only ever set by react-helmet-async after
// JavaScript runs. Non-JS clients — Twitterbot, facebookexternalhit,
// LinkedInBot, WhatsApp/iMessage/Slack unfurlers — never see them, so every
// shared link shows the generic homepage preview.
//
// Fix: clone dist/index.html (the real, hashed post-build shell) once per
// route with just the <head> meta swapped for that route's real values.
// The <body> — an empty <div id="root"> plus the built script tag — is left
// byte-identical, so a real visitor's React app boots exactly as it always
// did; only a crawler that doesn't run JS benefits from the difference.
// Static hosts (Vercel included) serve a real file at <route>/index.html in
// preference to a SPA rewrite, so this needs no platform-specific config.
//
// Fail-soft by design, same as generate-sitemap.mjs: any error (no env
// vars, no network, a route whose literal text moved) skips that route and
// leaves the build alone. Never breaks the deploy over this.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SITE_URL = "https://karnhracademy.com";
const DIST = "dist";
const BASE_HTML = readFileSync(`${DIST}/index.html`, "utf8");

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function envVar(name) {
  if (process.env[name]) return process.env[name];
  try {
    const match = readFileSync(".env", "utf8").match(new RegExp(`^${name}="?([^"\\n]+)"?`, "m"));
    return match?.[1];
  } catch {
    return undefined;
  }
}

// The exact strings currently baked into index.html's <head> (see
// index.html and src/components/SEO.tsx — every page's default) — swapped
// out per route. Kept as named constants so a future homepage-copy edit
// makes this script fail loudly (nothing matches) rather than silently
// mismatching.
const DEFAULT_TITLE = "Karn HR Academy — Free HR &amp; Management Study Resources";
const DEFAULT_DESC = "Free study notes, video lectures, MCQs, and research resources for MBA, BBA &amp; UGC NET/JRF aspirants in HR &amp; Management. Built by an educator, for serious learners.";
const DEFAULT_OG_DESC = DEFAULT_DESC; // og:description and twitter:description in index.html both drop the trailing period-free variant identically today
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function buildHtml({ title, description, path, image = DEFAULT_IMAGE, type = "website", jsonLd }) {
  const url = `${SITE_URL}${path}`;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const fullTitle = `${safeTitle} — Karn HR Academy`;

  let html = BASE_HTML;
  html = html.replace(`<title>${DEFAULT_TITLE}</title>`, `<title>${fullTitle}</title>`);
  html = html.replace(
    `<meta name="description" content="${DEFAULT_DESC}">`,
    `<meta name="description" content="${safeDesc}">`,
  );
  html = html.replace(
    `<meta property="og:title" content="${DEFAULT_TITLE}" />`,
    `<meta property="og:title" content="${fullTitle}" />`,
  );
  html = html.replace(
    `<meta property="og:description" content="${DEFAULT_OG_DESC}" />`,
    `<meta property="og:description" content="${safeDesc}" />`,
  );
  html = html.replace(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:type" content="${type}" />\n    <meta property="og:url" content="${url}" />`,
  );
  if (image !== DEFAULT_IMAGE) {
    html = html.replace(
      `<meta property="og:image" content="${DEFAULT_IMAGE}" />`,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
    );
  }
  html = html.replace(
    `<meta name="twitter:title" content="${DEFAULT_TITLE}" />`,
    `<meta name="twitter:title" content="${fullTitle}" />`,
  );
  html = html.replace(
    `<meta name="twitter:description" content="${DEFAULT_DESC}" />`,
    `<meta name="twitter:description" content="${safeDesc}" />`,
  );
  if (image !== DEFAULT_IMAGE) {
    html = html.replace(
      `<meta name="twitter:image" content="${DEFAULT_IMAGE}" />`,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    );
  }
  html = html.replace(`<meta name="google-site-verification"`, `<link rel="canonical" href="${url}" />\n    <meta name="google-site-verification"`);
  if (jsonLd) {
    html = html.replace("</head>", `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`);
  }
  return html;
}

function writeRoute(path, html) {
  const outPath = `${DIST}${path}/index.html`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
}

// Static routes — same title/description every page already passes its own
// <SEO> component (see each page's <SEO title=... description=... path=.../>
// call), so a bot's snapshot always matches what a JS-executing visitor
// sees a moment later.
const STATIC_ROUTES = [
  { path: "/notes", title: "Study Notes", description: "Downloadable MBA study notes organised by discipline — HRM, Strategic Management, OB, POM, Business Communication and more." },
  { path: "/ugc-net-labour-welfare", title: "UGC NET/JRF Labour Welfare — Unit-wise Notes, MCQs & PYQs", description: "UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / Labour & Social Welfare / HRM (Subject Code 55) — unit-wise study notes, MCQs and previous year question papers, organised across Units I–X.", jsonLd: { "@context": "https://schema.org", "@type": "Course", name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub", description: "Free unit-wise preparation covering all 10 official units of UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / HRM — study notes, MCQs, and previous year question papers.", provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL }, isAccessibleForFree: true, inLanguage: "en" } },
  { path: "/lectures", title: "Video Lectures", description: "Watch HR Management, Organisational Behaviour, Strategic Management and other video lectures for MBA, BBA, and UGC NET/JRF preparation." },
  { path: "/live-lectures", title: "Live Lectures", description: "Join interactive live classes and Q&A sessions on HR & Management topics with Karn HR Academy." },
  { path: "/quizzes", title: "MCQ Quizzes — HR & Management Assessment", description: "Topic-wise MCQ quizzes for MBA, BBA, and UGC NET/JRF HR exam preparation. Instant results, detailed explanations, and progress tracking." },
  { path: "/books", title: "Book Recommendations", description: "Curated book recommendations on Human Resource Management for students, scholars, and HR researchers." },
  { path: "/newspaper", title: "Newspaper Highlights", description: "Daily newspaper highlights across business, international, sports, general, and editorial for HR aspirants." },
  { path: "/about", title: "About", description: "About the educator behind Karn HR Academy — PhD scholar specialising in Ethical HRM and Quiet Quitting." },
  { path: "/contact", title: "Contact", description: "Have questions or want to collaborate? Reach out to the Karn HR Academy team." },
  { path: "/privacy-policy", title: "Privacy Policy", description: "How Karn HR Academy collects, uses, and protects your personal information." },
  { path: "/terms", title: "Terms of Use", description: "The terms and conditions for using Karn HR Academy's notes, quizzes, lectures, and other resources." },
  { path: "/blogs", title: "Blog — HR & Management Insights", description: "In-depth articles on Human Resource Management, Organisational Behaviour, Strategic HRM, and academic research for MBA, BBA, and UGC NET/JRF aspirants." },
];

let written = 0;
for (const route of STATIC_ROUTES) {
  try {
    writeRoute(route.path, buildHtml(route));
    written += 1;
  } catch (e) {
    console.warn(`og-previews: skipped ${route.path} — ${e.message}`);
  }
}
console.log(`og-previews: ${written}/${STATIC_ROUTES.length} static route(s) prerendered`);

// Blog posts — dynamic, fetched from Supabase (same pattern as
// generate-sitemap.mjs). Each gets its own real per-post OG image, which
// was already being generated on publish and going unused for link
// previews until now.
try {
  const base = envVar("VITE_SUPABASE_URL");
  const key = envVar("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!base || !key) throw new Error("Supabase env vars not set");

  const res = await fetch(
    `${base}/rest/v1/blog_posts?select=slug,title,excerpt,content,cover_image&published=eq.true`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`blog_posts fetch returned ${res.status}`);
  const posts = await res.json();

  let count = 0;
  for (const post of posts) {
    if (!post.slug || !post.title) continue;
    const description = post.excerpt || (post.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    writeRoute(`/blogs/${post.slug}`, buildHtml({
      title: post.title,
      description,
      path: `/blogs/${post.slug}`,
      image: post.cover_image || DEFAULT_IMAGE,
      type: "article",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: description || undefined,
        image: post.cover_image || undefined,
        mainEntityOfPage: `${SITE_URL}/blogs/${post.slug}`,
      },
    }));
    count += 1;
  }
  console.log(`og-previews: ${count} blog post(s) prerendered`);
} catch (e) {
  console.warn(`og-previews: dynamic blog posts skipped — ${e.message}`);
}
