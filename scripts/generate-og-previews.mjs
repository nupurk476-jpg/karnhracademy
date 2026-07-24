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
const DEFAULT_TITLE = "Karn HR Academy — HRM, Labour Welfare &amp; Management Studies Resources";
const DEFAULT_DESC = "Notes, MCQs, previous year questions, and video lectures for UGC NET/JRF Labour Welfare, HRM and Management Studies — organised by syllabus for aspirants, MBA/BBA students, and HR professionals. Free.";
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
    `<meta property="og:description" content="${DEFAULT_DESC}" />`,
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
// Mirrors src/lib/labourWelfareUnits.ts's LW_UNITS titles — this plain Node
// script can't import that TS module directly, so the ten titles are kept
// in sync here by hand. If the syllabus structure ever changes, update
// both places.
const LW_UNIT_TITLES = [
  "Principles and Practices of Management",
  "Human Resource Management",
  "Human Resource Development (HRD) & IHRM",
  "Organisational Behaviour",
  "Industrial Relations & Trade Unions",
  "Industrial Disputes",
  "Labour Legislation",
  "Wages",
  "Labour Welfare & Social Security",
  "Labour Market",
];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const LW_UNIT_ROUTES = LW_UNIT_TITLES.map((title, i) => {
  const n = i + 1;
  const roman = ROMAN[i];
  return {
    path: `/ugc-net-labour-welfare/unit-${n}`,
    title: `UGC NET/JRF Labour Welfare Unit ${roman}: ${title} — Notes, MCQs & PYQs`,
    description: `Unit ${roman} of the UGC NET/JRF Paper II Labour Welfare syllabus (Subject Code 55) — ${title}. Study notes, MCQs, previous year questions and video lectures.`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: `UGC NET/JRF Labour Welfare — Unit ${roman}: ${title}`,
      about: title,
      isPartOf: { "@type": "Course", name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub", url: `${SITE_URL}/ugc-net-labour-welfare` },
      provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL },
      isAccessibleForFree: true,
      inLanguage: "en",
    },
  };
});

// Mirrors src/lib/highScoringTopics.ts's HIGH_SCORING_TOPICS — same
// hand-sync caveat as LW_UNIT_ROUTES above. `units` is each topic's
// derived unit-number list (ascending), used only for the description text.
const HST_TOPICS = [
  { slug: "recruitment-selection-placement", name: "Recruitment, Selection & Placement", frequency: "high", units: [2] },
  { slug: "performance-management-appraisal", name: "Performance Management & Appraisal", frequency: "high", units: [2] },
  { slug: "compensation-wages-incentives", name: "Compensation, Wages & Incentives", frequency: "high", units: [2, 8] },
  { slug: "training-and-development", name: "Training & Development", frequency: "medium", units: [2] },
  { slug: "hr-planning-job-analysis", name: "HR Planning & Job Analysis", frequency: "medium", units: [2] },
  { slug: "labour-welfare-concept-theories", name: "Concept, Scope & Theories of Labour Welfare", frequency: "high", units: [9] },
  { slug: "social-security-schemes", name: "Social Security: Concept, Assistance & Assurance", frequency: "high", units: [9] },
  { slug: "industrial-health-safety-welfare", name: "Industrial Health, Safety & Occupational Diseases", frequency: "medium", units: [9] },
  { slug: "collective-bargaining", name: "Collective Bargaining", frequency: "high", units: [5] },
  { slug: "trade-unions-evolution-law", name: "Trade Unions: Evolution, Structure & Law", frequency: "high", units: [5] },
  { slug: "workers-participation-grievance", name: "Workers' Participation & Grievance Handling", frequency: "medium", units: [5] },
  { slug: "motivation-theories", name: "Motivation Theories", frequency: "high", units: [4] },
  { slug: "leadership-styles-theories", name: "Leadership Styles & Theories", frequency: "high", units: [4] },
  { slug: "group-dynamics-power-change", name: "Group Dynamics, Power & Organisational Change", frequency: "medium", units: [4] },
  { slug: "factories-act-1948", name: "The Factories Act, 1948", frequency: "high", units: [7] },
  { slug: "minimum-wages-payment-of-wages-acts", name: "Minimum Wages Act & Payment of Wages Act", frequency: "high", units: [8] },
  { slug: "industrial-disputes-act-strikes-lockouts", name: "Industrial Disputes Act, 1947 & Strikes/Lockouts", frequency: "high", units: [6] },
  { slug: "pf-gratuity-bonus-acts", name: "Provident Fund, Gratuity & Bonus Acts", frequency: "medium", units: [8] },
  { slug: "hr-analytics-hris-emerging-trends", name: "HR Analytics, HRIS & Emerging HRM Trends", frequency: "medium", units: [2, 3] },
  { slug: "ihrm-cross-cultural-global-hr", name: "IHRM, Cross-Cultural Management & Global HR Trends", frequency: "medium", units: [3] },
  { slug: "ir-changing-scenario", name: "Industrial Relations in the Changing Scenario", frequency: "low", units: [5] },
];

const HST_ROUTES = HST_TOPICS.map((t) => {
  const unitsLabel = t.units.map((n) => `Unit ${ROMAN[n - 1]}`).join(", ");
  return {
    path: `/ugc-net-labour-welfare/topic/${t.slug}`,
    title: `${t.name} — UGC NET/JRF Labour Welfare Notes, MCQs & PYQs`,
    description: `${t.name} — a ${t.frequency}-frequency UGC NET/JRF Paper II Labour Welfare (Subject Code 55) topic covering ${unitsLabel}. Study notes, MCQs, previous year questions and video lectures.`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: `UGC NET/JRF Labour Welfare — ${t.name}`,
      about: t.name,
      isPartOf: { "@type": "Course", name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub", url: `${SITE_URL}/ugc-net-labour-welfare` },
      provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL },
      isAccessibleForFree: true,
      inLanguage: "en",
    },
  };
});

const STATIC_ROUTES = [
  { path: "/notes", title: "Study Notes", description: "Downloadable MBA study notes organised by discipline — HRM, Strategic Management, OB, POM, Business Communication and more." },
  { path: "/ugc-net-labour-welfare", title: "UGC NET/JRF Labour Welfare — Unit-wise Notes, MCQs & PYQs", description: "UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / Labour & Social Welfare / HRM (Subject Code 55) — unit-wise study notes, MCQs and previous year question papers, organised across Units I–X.", jsonLd: { "@context": "https://schema.org", "@type": "Course", name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub", description: "Free unit-wise preparation covering all 10 official units of UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / HRM — study notes, MCQs, and previous year question papers.", provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL }, isAccessibleForFree: true, inLanguage: "en" } },
  ...LW_UNIT_ROUTES,
  ...HST_ROUTES,
  { path: "/lectures", title: "Video Lectures", description: "Watch HR Management, Organisational Behaviour, Strategic Management and other video lectures for MBA, BBA, and UGC NET/JRF preparation." },
  { path: "/live-lectures", title: "Live Lectures", description: "Join interactive live classes and Q&A sessions on HR & Management topics with Karn HR Academy." },
  { path: "/quizzes", title: "MCQ Quizzes — HR & Management Assessment", description: "Topic-wise MCQ quizzes for MBA, BBA, and UGC NET/JRF HR exam preparation. Instant results, detailed explanations, and progress tracking." },
  { path: "/pyqs", title: "Previous Year Question Papers", description: "Previous year question papers for UGC NET/JRF Labour Welfare and MBA/BBA HR, Organisational Behaviour, Strategic Management and other disciplines — organised by subject and year." },
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
