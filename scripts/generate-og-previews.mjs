// Runs after `vite build` (see package.json). This is a pure client-side
// SPA (see src/main.tsx — createRoot, not SSR), so every page's real title/
// description/OG/Twitter tags are only ever set by react-helmet-async after
// JavaScript runs. Non-JS clients — Twitterbot, facebookexternalhit,
// LinkedInBot, WhatsApp/iMessage/Slack unfurlers — never see them, so every
// shared link shows the generic homepage preview.
//
// Fix: clone dist/index.html (the real, hashed post-build shell) once per
// route with the <head> meta swapped for that route's real values, and —
// for syllabus-structured routes whose content lives in static in-repo
// data — real body text injected into <div id="root">. React's createRoot
// (see src/main.tsx — client render, not hydrateRoot) replaces #root's
// children wholesale on mount, so a JS-executing visitor still gets the
// exact app they always did; crawlers that don't run JS now index real
// content and internal links instead of an empty shell.
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

// Pulls the official unit/topic structure straight out of the app's own
// data module so the prerendered content can never drift from what the
// live page renders. Regex-parsed (this plain Node script can't import TS);
// fails soft to null — the affected routes then keep today's meta-only
// shells rather than breaking the build.
function parseLWUnits() {
  try {
    const src = readFileSync("src/lib/labourWelfareUnits.ts", "utf8");
    const arrText = src.match(/export const LW_UNITS[^=]*=\s*\[([\s\S]*?)\n\];/)?.[1];
    if (!arrText) return null;
    const units = [];
    const blockRe = /number:\s*(\d+),\s*title:\s*"([^"]+)",\s*topics:\s*\[([\s\S]*?)\]/g;
    let m;
    while ((m = blockRe.exec(arrText))) {
      const topics = [];
      const topicRe = /label:\s*"([^"]+)",\s*slug:\s*"([^"]+)"/g;
      let t;
      while ((t = topicRe.exec(m[3]))) topics.push({ label: t[1], slug: t[2] });
      if (topics.length === 0) return null;
      units.push({ number: Number(m[1]), title: m[2], topics });
    }
    return units.length === 10 ? units : null;
  } catch {
    return null;
  }
}
const LW_UNITS_DATA = parseLWUnits();
if (!LW_UNITS_DATA) console.warn("og-previews: LW_UNITS parse failed — unit/topic routes get meta-only shells");

// Plain semantic HTML with light inline styling: visible for only the
// moment before React mounts and replaces it, fully readable to any
// crawler that never runs JS at all.
const contentWrap = (inner) =>
  `<div style="max-width:760px;margin:0 auto;padding:48px 24px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.65">${inner}</div>`;

const breadcrumbLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path}`,
  })),
});

function buildHtml({ title, description, path, image = DEFAULT_IMAGE, type = "website", jsonLd, content }) {
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
  if (content) {
    html = html.replace(`<div id="root"></div>`, `<div id="root">${content}</div>`);
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
  const path = `/ugc-net-labour-welfare/unit-${n}`;
  const unitData = LW_UNITS_DATA?.find(u => u.number === n);

  let content;
  if (unitData) {
    const topicItems = unitData.topics
      .map(t => `<li>${escapeHtml(t.label)}</li>`)
      .join("");
    const prev = n > 1 ? `<a href="/ugc-net-labour-welfare/unit-${n - 1}">← Unit ${ROMAN[i - 1]}: ${escapeHtml(LW_UNIT_TITLES[i - 1])}</a>` : "";
    const next = n < 10 ? `<a href="/ugc-net-labour-welfare/unit-${n + 1}">Unit ${ROMAN[i + 1]}: ${escapeHtml(LW_UNIT_TITLES[i + 1])} →</a>` : "";
    content = contentWrap(`
      <nav><a href="/">Home</a> › <a href="/ugc-net-labour-welfare">UGC NET/JRF Labour Welfare</a> › Unit ${roman}</nav>
      <h1>Unit ${roman}: ${escapeHtml(title)} — UGC NET/JRF Labour Welfare</h1>
      <p>Unit ${roman} of the official UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / HRM syllabus (Subject Code 55). Free study notes, topic-wise MCQs, previous year question papers and video lectures for every topic in this unit.</p>
      <h2>Topics covered in Unit ${roman}</h2>
      <ul>${topicItems}</ul>
      <h2>Study resources</h2>
      <p>Explore <a href="/ugc-net-labour-welfare">the full unit-wise Labour Welfare study hub</a>, browse <a href="/notes">study notes</a>, practice <a href="/quizzes">MCQ sets</a>, or read <a href="/pyqs">previous year question papers</a> online.</p>
      <p>${prev}${prev && next ? " · " : ""}${next}</p>
    `);
  }

  return {
    path,
    title: `UGC NET/JRF Labour Welfare Unit ${roman}: ${title} — Notes, MCQs & PYQs`,
    description: `Unit ${roman} of the UGC NET/JRF Paper II Labour Welfare syllabus (Subject Code 55) — ${title}. Study notes, MCQs, previous year questions and video lectures.`,
    content,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        name: `UGC NET/JRF Labour Welfare — Unit ${roman}: ${title}`,
        about: title,
        isPartOf: { "@type": "Course", name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub", url: `${SITE_URL}/ugc-net-labour-welfare` },
        provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL },
        isAccessibleForFree: true,
        inLanguage: "en",
      },
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "UGC NET/JRF Labour Welfare", path: "/ugc-net-labour-welfare" },
        { name: `Unit ${roman}: ${title}`, path },
      ]),
    ],
  };
});

// Mirrors src/lib/highScoringTopics.ts's HIGH_SCORING_TOPICS — same
// hand-sync caveat as LW_UNIT_ROUTES above. `units` is each topic's
// derived unit-number list (ascending), used only for the description text.
const HST_TOPICS = [
  { slug: "recruitment", name: 'Recruitment', frequency: "high", units: [2] },
  { slug: "selection", name: 'Selection', frequency: "high", units: [2] },
  { slug: "placement", name: 'Placement', frequency: "medium", units: [2] },
  { slug: "interview-techniques", name: 'Interview Techniques', frequency: "medium", units: [2] },
  { slug: "selection-tests", name: 'Selection Tests', frequency: "medium", units: [2] },
  { slug: "assessment-centre-selection", name: 'Assessment Centre (Selection)', frequency: "medium", units: [2] },
  { slug: "psychometric-tests", name: 'Psychometric Tests', frequency: "medium", units: [2] },
  { slug: "human-resource-planning", name: 'Human Resource Planning', frequency: "high", units: [2] },
  { slug: "job-analysis", name: 'Job Analysis', frequency: "high", units: [2] },
  { slug: "job-design", name: 'Job Design', frequency: "medium", units: [2] },
  { slug: "job-evaluation", name: 'Job Evaluation', frequency: "medium", units: [2] },
  { slug: "performance-management", name: 'Performance Management', frequency: "high", units: [2] },
  { slug: "performance-appraisal", name: 'Performance Appraisal', frequency: "high", units: [2] },
  { slug: "360-degree-feedback", name: '360 Degree Feedback', frequency: "medium", units: [2] },
  { slug: "mbo", name: 'MBO (Management by Objectives)', frequency: "medium", units: [2] },
  { slug: "bars", name: 'BARS (Behaviourally Anchored Rating Scales)', frequency: "low", units: [2] },
  { slug: "assessment-centre-performance", name: 'Assessment Centre (Performance Appraisal)', frequency: "medium", units: [2] },
  { slug: "kpi-kra", name: 'KPI & KRA', frequency: "medium", units: [2] },
  { slug: "balanced-scorecard", name: 'Balanced Scorecard', frequency: "medium", units: [2] },
  { slug: "compensation-management", name: 'Compensation Management', frequency: "high", units: [2] },
  { slug: "wage-determination", name: 'Wage Determination', frequency: "high", units: [8] },
  { slug: "wage-theories", name: 'Wage Theories', frequency: "high", units: [8] },
  { slug: "incentive-plans", name: 'Incentive Plans', frequency: "medium", units: [2] },
  { slug: "executive-compensation", name: 'Executive Compensation', frequency: "low", units: [2] },
  { slug: "maslow-need-hierarchy-theory", name: 'Maslow\'s Need Hierarchy Theory', frequency: "high", units: [4] },
  { slug: "herzberg-two-factor-theory", name: 'Herzberg\'s Two-Factor Theory', frequency: "high", units: [4] },
  { slug: "mcgregor-theory-x-y", name: 'McGregor\'s Theory X & Theory Y', frequency: "high", units: [4] },
  { slug: "mcclelland-need-theory", name: 'McClelland\'s Need Theory', frequency: "medium", units: [4] },
  { slug: "vroom-expectancy-theory", name: 'Vroom\'s Expectancy Theory', frequency: "medium", units: [4] },
  { slug: "porter-lawler-model", name: 'Porter–Lawler Model', frequency: "medium", units: [4] },
  { slug: "adams-equity-theory", name: 'Adams\' Equity Theory', frequency: "medium", units: [4] },
  { slug: "skinner-reinforcement-theory", name: 'Skinner\'s Reinforcement Theory', frequency: "low", units: [4] },
  { slug: "trait-theory-of-leadership", name: 'Trait Theory of Leadership', frequency: "high", units: [4] },
  { slug: "behavioural-theory-of-leadership", name: 'Behavioural Theory of Leadership', frequency: "medium", units: [4] },
  { slug: "contingency-theory-of-leadership", name: 'Contingency Theory of Leadership', frequency: "medium", units: [4] },
  { slug: "fiedler-contingency-model", name: 'Fiedler Contingency Model', frequency: "medium", units: [4] },
  { slug: "hersey-blanchard-situational-leadership", name: 'Hersey–Blanchard Situational Leadership', frequency: "medium", units: [4] },
  { slug: "path-goal-theory", name: 'Path–Goal Theory', frequency: "medium", units: [4] },
  { slug: "transformational-leadership", name: 'Transformational Leadership', frequency: "high", units: [4] },
  { slug: "transactional-leadership", name: 'Transactional Leadership', frequency: "medium", units: [4] },
  { slug: "collective-bargaining", name: 'Collective Bargaining', frequency: "high", units: [5] },
  { slug: "trade-unions", name: 'Trade Unions', frequency: "high", units: [5] },
  { slug: "workers-participation", name: 'Workers\' Participation', frequency: "high", units: [5] },
  { slug: "grievance-handling", name: 'Grievance Handling', frequency: "high", units: [5] },
  { slug: "discipline", name: 'Discipline', frequency: "medium", units: [5] },
  { slug: "industrial-democracy", name: 'Industrial Democracy', frequency: "low", units: [5] },
  { slug: "factories-act-1948", name: 'Factories Act, 1948', frequency: "high", units: [7] },
  { slug: "trade-union-act-1926", name: 'Trade Union Act, 1926', frequency: "high", units: [5] },
  { slug: "industrial-disputes-act-1947", name: 'Industrial Disputes Act, 1947', frequency: "high", units: [6] },
  { slug: "strikes-and-lockouts", name: 'Strikes and Lockouts', frequency: "medium", units: [6] },
  { slug: "minimum-wages-act-1948", name: 'Minimum Wages Act, 1948', frequency: "high", units: [8] },
  { slug: "payment-of-wages-act-1936", name: 'Payment of Wages Act, 1936', frequency: "high", units: [8] },
  { slug: "payment-of-bonus-act-1965", name: 'Payment of Bonus Act, 1965', frequency: "medium", units: [8] },
  { slug: "payment-of-gratuity-act-1972", name: 'Payment of Gratuity Act, 1972', frequency: "high", units: [8] },
  { slug: "employees-compensation-act-1923", name: 'Employees\' Compensation Act, 1923', frequency: "medium", units: [9] },
  { slug: "esi-act-1948", name: 'Employees\' State Insurance Act, 1948 (ESI)', frequency: "medium", units: [9] },
  { slug: "epf-act-1952", name: 'Employees\' Provident Fund Act, 1952 (EPF)', frequency: "high", units: [8] },
  { slug: "maternity-benefit-act-1961", name: 'Maternity Benefit Act, 1961', frequency: "medium", units: [9] },
  { slug: "equal-remuneration-act-1976", name: 'Equal Remuneration Act, 1976', frequency: "medium", units: [8] },
  { slug: "osh-code-2020", name: 'Occupational Safety, Health & Working Conditions Code, 2020', frequency: "medium", units: [9] },
  { slug: "ir-code-2020", name: 'Industrial Relations Code, 2020', frequency: "medium", units: [5, 6] },
  { slug: "code-on-wages-2019", name: 'Code on Wages, 2019', frequency: "medium", units: [8] },
  { slug: "code-on-social-security-2020", name: 'Code on Social Security, 2020', frequency: "medium", units: [9] },
  { slug: "competency-mapping", name: 'Competency Mapping', frequency: "medium", units: [2] },
  { slug: "talent-management", name: 'Talent Management', frequency: "high", units: [2] },
  { slug: "succession-planning", name: 'Succession Planning', frequency: "medium", units: [2] },
  { slug: "career-planning", name: 'Career Planning', frequency: "medium", units: [2] },
  { slug: "employee-engagement", name: 'Employee Engagement', frequency: "high", units: [2] },
  { slug: "employee-retention", name: 'Employee Retention', frequency: "medium", units: [2] },
  { slug: "strategic-hrm", name: 'Strategic HRM', frequency: "high", units: [2] },
  { slug: "hr-audit", name: 'HR Audit', frequency: "medium", units: [3] },
  { slug: "hr-analytics", name: 'HR Analytics', frequency: "high", units: [2, 3] },
  { slug: "hr-scorecard", name: 'HR Scorecard', frequency: "low", units: [3] },
  { slug: "ihrm-cross-cultural-global-hr", name: 'IHRM, Cross-Cultural Management & Global HR Trends', frequency: "medium", units: [3] },
  { slug: "ir-changing-scenario", name: 'Industrial Relations in the Changing Scenario', frequency: "low", units: [5] },
  { slug: "green-hrm", name: 'Green HRM', frequency: "medium", units: [2] },
  { slug: "e-hrm", name: 'e-HRM', frequency: "medium", units: [3] },
  { slug: "gig-economy", name: 'Gig Economy', frequency: "high", units: [10] },
  { slug: "organizational-culture", name: 'Organizational Culture', frequency: "high", units: [4] },
  { slug: "organizational-climate", name: 'Organizational Climate', frequency: "medium", units: [4] },
  { slug: "organizational-development", name: 'Organizational Development', frequency: "high", units: [4] },
  { slug: "organizational-change", name: 'Organizational Change', frequency: "high", units: [4] },
  { slug: "conflict-management", name: 'Conflict Management', frequency: "high", units: [5] },
  { slug: "stress-management", name: 'Stress Management', frequency: "medium", units: [4] },
  { slug: "emotional-intelligence", name: 'Emotional Intelligence', frequency: "medium", units: [4] },
  { slug: "learning-organization", name: 'Learning Organization', frequency: "medium", units: [4] },
  { slug: "group-dynamics", name: 'Group Dynamics', frequency: "high", units: [4] },
  { slug: "power-and-authority", name: 'Power & Authority', frequency: "medium", units: [4] },
  { slug: "labour-welfare-concept-theories", name: 'Labour Welfare: Concept, Scope & Theories', frequency: "high", units: [9] },
  { slug: "labour-welfare-funds", name: 'Labour Welfare Funds', frequency: "medium", units: [9] },
  { slug: "social-security-schemes", name: 'Social Security: Concept, Assistance & Assurance', frequency: "high", units: [9] },
  { slug: "ilo", name: 'International Labour Organisation (ILO)', frequency: "high", units: [7] },
  { slug: "industrial-health-safety-welfare", name: 'Industrial Health, Safety & Occupational Diseases', frequency: "medium", units: [9] },
  { slug: "labour-market", name: 'Labour Market', frequency: "medium", units: [10] },
  { slug: "training-and-development", name: 'Training & Development', frequency: "medium", units: [2] },
];

const FREQ_TEXT = { high: "very frequently asked", medium: "occasionally asked", low: "rarely asked" };

// Same honest, data-derived FAQ template as getTopicFaqs in
// src/lib/highScoringTopics.ts — visible copy and structured data must
// match what the live page shows once React mounts.
function topicFaqs(t) {
  const unitText = t.units.length
    ? t.units.map((n) => `Unit ${ROMAN[n - 1]} (${LW_UNIT_TITLES[n - 1]})`).join(" and ")
    : "the UGC NET Paper II Labour Welfare syllabus";
  const importance =
    t.frequency === "high"
      ? `Yes — ${t.name} is one of the most frequently asked areas in UGC NET Paper II Labour Welfare (Subject Code 55). Questions from it recur across exam cycles, so treat it as a must-prepare topic.`
      : t.frequency === "medium"
        ? `${t.name} appears occasionally in UGC NET Paper II Labour Welfare (Subject Code 55). It's a solid-return topic: prepare it after the very-high-frequency areas are covered.`
        : `${t.name} is asked relatively rarely in UGC NET Paper II Labour Welfare (Subject Code 55), but it belongs to the official syllabus — cover it for completeness once the higher-frequency topics are done.`;
  return [
    { question: `Is ${t.name} important for UGC NET Paper II (Labour Welfare / HRM)?`, answer: importance },
    { question: `Which unit of the UGC NET Labour Welfare syllabus covers ${t.name}?`, answer: `${t.name} falls under ${unitText} of the official UGC NET/JRF Paper II syllabus for Labour Welfare / Personnel Management / Industrial Relations / HRM (Subject Code 55).` },
    { question: `How should I prepare ${t.name} for UGC NET?`, answer: `Start with the unit-wise study notes for ${t.name}, then attempt the matching topic-wise MCQ sets, and finish by checking how it has been asked in previous year question papers. All three are free on Karn HR Academy.` },
  ];
}

const HST_ROUTES = HST_TOPICS.map((t) => {
  const unitsLabel = t.units.map((n) => `Unit ${ROMAN[n - 1]}`).join(", ");
  const path = `/ugc-net-labour-welfare/topic/${t.slug}`;
  const faqs = topicFaqs(t);

  const unitLinks = t.units
    .map((n) => `<li><a href="/ugc-net-labour-welfare/unit-${n}">Unit ${ROMAN[n - 1]}: ${escapeHtml(LW_UNIT_TITLES[n - 1])}</a></li>`)
    .join("");
  const content = contentWrap(`
    <nav><a href="/">Home</a> › <a href="/ugc-net-labour-welfare">UGC NET/JRF Labour Welfare</a> › ${escapeHtml(t.name)}</nav>
    <h1>${escapeHtml(t.name)} — UGC NET/JRF Labour Welfare</h1>
    <p>${escapeHtml(t.name)} is a high-scoring topic in the UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / HRM syllabus (Subject Code 55). In recent exams this topic has been ${FREQ_TEXT[t.frequency]}, making it a ${t.frequency === "high" ? "must-prepare area" : t.frequency === "medium" ? "solid-return area" : "completeness area"} for serious aspirants.</p>
    <h2>Where it sits in the official syllabus</h2>
    <ul>${unitLinks}</ul>
    <h2>How to prepare this topic</h2>
    <p>Read the unit-wise <a href="/notes">study notes</a> for ${escapeHtml(t.name)}, practice the matching <a href="/quizzes">topic-wise MCQ sets</a>, and check how it has appeared in <a href="/pyqs">previous year question papers</a> — all free on Karn HR Academy.</p>
    <h2>Frequently Asked Questions</h2>
    ${faqs.map((f) => `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`).join("")}
    <p><a href="/ugc-net-labour-welfare">← Back to the full UGC NET/JRF Labour Welfare study hub</a></p>
  `);

  return {
    path,
    title: `${t.name} — UGC NET/JRF Labour Welfare Notes, MCQs & PYQs`,
    description: `${t.name} — a ${t.frequency}-frequency UGC NET/JRF Paper II Labour Welfare (Subject Code 55) topic covering ${unitsLabel}. Study notes, MCQs, previous year questions and video lectures.`,
    content,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        name: `UGC NET/JRF Labour Welfare — ${t.name}`,
        about: t.name,
        isPartOf: { "@type": "Course", name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub", url: `${SITE_URL}/ugc-net-labour-welfare` },
        provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL },
        isAccessibleForFree: true,
        inLanguage: "en",
      },
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "UGC NET/JRF Labour Welfare", path: "/ugc-net-labour-welfare" },
        { name: t.name, path },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };
});

// Full syllabus baked into the hub page's shell — every unit heading and
// every official topic name, each unit linking to its subpage.
const LW_HUB_CONTENT = LW_UNITS_DATA
  ? contentWrap(`
    <h1>UGC NET/JRF Labour Welfare — Unit-wise Study Hub (Subject Code 55)</h1>
    <p>Free unit-wise preparation for UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / Labour &amp; Social Welfare / Human Resource Management — study notes, topic-wise MCQs and previous year question papers organised strictly by the official syllabus, Units I through X.</p>
    ${LW_UNITS_DATA.map(u => `
      <h2><a href="/ugc-net-labour-welfare/unit-${u.number}">Unit ${ROMAN[u.number - 1]}: ${escapeHtml(u.title)}</a></h2>
      <ul>${u.topics.map(t => `<li>${escapeHtml(t.label)}</li>`).join("")}</ul>
    `).join("")}
    <h2>Study resources</h2>
    <p>Browse <a href="/notes">study notes</a>, practice <a href="/quizzes">MCQ sets</a>, read <a href="/pyqs">previous year question papers</a> online, or watch <a href="/lectures">video lectures</a>.</p>
  `)
  : undefined;

// Hand-synced with src/pages/MBABBAPage.tsx (SEMESTER_GUIDE) and
// src/lib/disciplines.ts (labels/descriptions) — same caveat as
// LW_UNIT_TITLES above.
const MBA_BBA_CONTENT = contentWrap(`
  <h1>MBA / BBA Management Studies Hub</h1>
  <p>Free semester-wise study resources for MBA, BBA, PGDM and B.Com students — seven core HR &amp; Management subjects with study notes, topic-wise MCQ practice and video lectures.</p>
  <h2>Which subject in which semester?</h2>
  <p><strong>BBA / B.Com:</strong> Sem 1–2 — Principles of Management, Business Communication · Sem 3–4 — Organisational Behaviour, Human Resource Management · Sem 5–6 — Strategic Management, OD &amp; Change Management (elective).</p>
  <p><strong>MBA / PGDM:</strong> Sem 1 — Principles of Management, Organisational Behaviour, Business Communication · Sem 2 — Human Resource Management, Strategic Management · Sem 3–4 (HR specialisation) — OD &amp; Change Management, International HRM Practices.</p>
  <h2>Subjects covered</h2>
  <ul>
    <li>Human Resource Management — recruitment, compensation, SHRM, HR analytics, labour law</li>
    <li>Organisational Behaviour — individual behaviour, motivation, leadership, group dynamics</li>
    <li>Strategic Management — SWOT, Porter's five forces, strategy formulation &amp; evaluation</li>
    <li>Principles of Management — planning, organising, directing, controlling, Fayol &amp; Taylor</li>
    <li>Business Communication — written, verbal, cross-cultural &amp; digital business communication</li>
    <li>OD &amp; Change Management — OD interventions, change models, managing resistance</li>
    <li>International HRM Practices — expatriate management, international staffing, MNCs &amp; diversity</li>
  </ul>
  <p>Browse <a href="/notes">study notes</a>, practice <a href="/quizzes">MCQ sets</a>, or watch <a href="/lectures">video lectures</a>. Preparing for UGC NET instead? Visit the <a href="/ugc-net-labour-welfare">UGC NET/JRF Labour Welfare hub</a>.</p>
`);

const STATIC_ROUTES = [
  { path: "/notes", title: "Study Notes", description: "Downloadable MBA study notes organised by discipline — HRM, Strategic Management, OB, POM, Business Communication and more." },
  { path: "/ugc-net-labour-welfare", title: "UGC NET/JRF Labour Welfare — Unit-wise Notes, MCQs & PYQs", description: "UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / Labour & Social Welfare / HRM (Subject Code 55) — unit-wise study notes, MCQs and previous year question papers, organised across Units I–X.", content: LW_HUB_CONTENT, jsonLd: { "@context": "https://schema.org", "@type": "Course", name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub", description: "Free unit-wise preparation covering all 10 official units of UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / HRM — study notes, MCQs, and previous year question papers.", provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL }, isAccessibleForFree: true, inLanguage: "en" } },
  ...LW_UNIT_ROUTES,
  ...HST_ROUTES,
  { path: "/mba-bba", title: "MBA / BBA HR & Management Studies — Notes, MCQs & Video Lectures", description: "Free semester-wise study resources for MBA, BBA, PGDM and B.Com students — HRM, Organisational Behaviour, Principles of Management, Strategic Management, Business Communication, OD & Change Management and International HRM notes, MCQ practice sets and video lectures.", content: MBA_BBA_CONTENT, jsonLd: { "@context": "https://schema.org", "@type": "Course", name: "MBA / BBA HR & Management Studies Hub", description: "Free notes, MCQ practice and video lectures across seven core HR & Management subjects for MBA, BBA, PGDM and B.Com students.", provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL }, isAccessibleForFree: true, inLanguage: "en" } },
  { path: "/lectures", title: "Video Lectures", description: "Watch HR Management, Organisational Behaviour, Strategic Management and other video lectures for MBA, BBA, and UGC NET/JRF preparation." },
  { path: "/live-lectures", title: "Live Lectures", description: "Join interactive live classes and Q&A sessions on HR & Management topics with Karn HR Academy." },
  { path: "/quizzes", title: "MCQ Quizzes — HR & Management Assessment", description: "Topic-wise MCQ quizzes for MBA, BBA, and UGC NET/JRF HR exam preparation. Instant results, detailed explanations, and progress tracking." },
  { path: "/pyqs", title: "Previous Year Question Papers", description: "Previous year question papers for UGC NET/JRF Labour Welfare, MBA/BBA HR, Organisational Behaviour, Strategic Management and other disciplines — organised by year." },
  { path: "/books", title: "Book Recommendations", description: "Curated book recommendations on Human Resource Management for students, scholars, and HR researchers." },
  { path: "/newspaper", title: "Newspaper Highlights", description: "Daily newspaper highlights across business, international, sports, general, and editorial for HR aspirants." },
  { path: "/about", title: "About Karn HR Academy", description: "A free, unit-wise study hub for HR & Management students — MBA, BBA, B.Com and UGC NET/JRF Labour Welfare — by Nupur Karn, UGC NET qualified educator and PhD scholar." },
  { path: "/contact", title: "Contact", description: "Have questions or want to collaborate? Reach out to the Karn HR Academy team." },
  { path: "/connect", title: "Connect with Karn HR Academy", description: "All Karn HR Academy channels in one place — YouTube, Facebook, LinkedIn, Instagram, Telegram, WhatsApp and email." },
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

// PYQ paper landing pages — dynamic, same pattern. Each shell carries the
// paper's real title/year meta plus a crawlable content block; papers
// uploaded after this deploy get their shells on the next one.
try {
  const base = envVar("VITE_SUPABASE_URL");
  const key = envVar("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!base || !key) throw new Error("Supabase env vars not set");

  const res = await fetch(
    `${base}/rest/v1/pyq_papers?select=id,title,year,subject,answer_key_url`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`pyq_papers fetch returned ${res.status}`);
  const papers = await res.json();

  let count = 0;
  for (const p of papers) {
    if (!p.id || !p.title) continue;
    const path = `/pyqs/paper/${p.id}`;
    const withKey = p.answer_key_url ? ", with answer key" : "";
    const description = `${p.title} — ${p.year} previous year question paper${withKey}. Read online free on Karn HR Academy (sign-in required).`;
    writeRoute(path, buildHtml({
      title: `${p.title} (${p.year})`,
      description,
      path,
      content: contentWrap(`
        <nav><a href="/">Home</a> › <a href="/pyqs">Previous Year Questions</a> › ${escapeHtml(p.title)}</nav>
        <h1>${escapeHtml(p.title)} (${p.year})</h1>
        <p>Original ${p.year} previous year question paper${withKey ? " complete with its official answer key" : ""}, free to read in our secure online viewer with page navigation, zoom, in-paper search and saved reading progress. A free account is required to read.</p>
        <p><a href="/pyqs">Browse all previous year question papers</a> · <a href="/ugc-net-labour-welfare">UGC NET/JRF Labour Welfare study hub</a> · <a href="/notes">Study notes</a> · <a href="/quizzes">Practice MCQs</a></p>
      `),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: p.title,
          description,
          learningResourceType: "Previous year question paper",
          datePublished: String(p.year),
          provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: SITE_URL },
          isAccessibleForFree: true,
          inLanguage: "en",
        },
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Previous Year Questions", path: "/pyqs" },
          { name: p.title, path },
        ]),
      ],
    }));
    count += 1;
  }
  console.log(`og-previews: ${count} PYQ paper page(s) prerendered`);
} catch (e) {
  console.warn(`og-previews: dynamic PYQ paper pages skipped — ${e.message}`);
}
