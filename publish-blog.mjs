#!/usr/bin/env node
/**
 * publish-blog.mjs
 *
 * Automated blog publishing pipeline for karnhracademy.
 * Reads a standalone HTML blog file (created in Claude.ai),
 * extracts and transforms all content, and inserts it as a
 * new row in the Supabase blog_posts table.
 *
 * Usage:
 *   node publish-blog.mjs <path-to-html-file> [options]
 *   npm run publish-blog -- <path-to-html-file> [options]
 *
 * Options:
 *   --publish               Set published=true immediately (default: saved as draft)
 *   --category "Name"       Override the auto-detected category
 *   --slug "my-slug"        Override the auto-generated slug
 *
 * Required env vars (in .env):
 *   VITE_SUPABASE_URL           Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   Service role key (bypasses RLS) — recommended
 *                               Falls back to VITE_SUPABASE_PUBLISHABLE_KEY if absent.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { JSDOM } from 'jsdom';
import { createClient } from '@supabase/supabase-js';

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const shouldPublish = args.includes('--publish');
const categoryOverride = getFlag('--category');
const slugOverride = getFlag('--slug');

if (!filePath) {
  console.error('\n❌  Usage: node publish-blog.mjs <path-to-html-file> [--publish] [--category "Name"] [--slug "my-slug"]\n');
  process.exit(1);
}

const htmlPath = resolve(process.cwd(), filePath);
if (!existsSync(htmlPath)) {
  console.error(`\n❌  File not found: ${htmlPath}\n`);
  process.exit(1);
}

// ── Validate env ──────────────────────────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌  Missing Supabase credentials. Set VITE_SUPABASE_URL in your .env file.\n');
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('\n⚠️  SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key (RLS permitting).\n');
}

// ── Read and parse HTML ───────────────────────────────────────────────────────
console.log(`\n📄  Reading: ${basename(htmlPath)}`);
const html = readFileSync(htmlPath, 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

// ── Helper ────────────────────────────────────────────────────────────────────
function textOf(el) {
  if (!el) return '';
  // Replace block elements with spaces so text doesn't run together
  el.querySelectorAll('br, p, div, h1, h2, h3, h4, h5, h6').forEach(b => {
    b.textContent = ' ' + b.textContent + ' ';
  });
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

// ── Extract metadata ──────────────────────────────────────────────────────────
// Title: prefer .hero h1 element text content, else fall back to a placeholder
const heroH1 = doc.querySelector('.hero h1');
const title = (heroH1
  ? textOf(heroH1.cloneNode(true))
  : (doc.querySelector('title')?.textContent ?? '').split('|')[0].replace(/\s+/g, ' ').trim()
) || 'Untitled Post';

// Author: from hero-meta (first span, after ✍ emoji)
const heroMetaText = textOf(doc.querySelector('.hero-meta'));
const authorMatch = heroMetaText.match(/[✍✏✐]\s*([^,|·\n]+)/);
const authorName = authorMatch ? authorMatch[1].trim().replace(/MBA.*$/, '').trim() : 'Nupur Karn';

// Excerpt: from .hero-sub paragraph — if absent, derived from the article
// body itself further down once that's been extracted.
const heroSubExcerpt = textOf(doc.querySelector('.hero-sub')).slice(0, 300);
let excerpt = heroSubExcerpt;

// Category: auto-detect from eyebrow/meta text
const eyebrowText = textOf(doc.querySelector('.hero-eyebrow'));
const combined = (eyebrowText + ' ' + heroMetaText).toLowerCase();
function detectCategory(text) {
  if (/organizational.behav|org.behav/i.test(text)) return 'Organizational Behaviour';
  if (/research.method/i.test(text))                 return 'Research Methodology';
  if (/ethical.hrm|ethics/i.test(text))              return 'Ethical HRM';
  if (/quiet.quitting/i.test(text))                  return 'Quiet Quitting';
  if (/current.affairs/i.test(text))                 return 'Current Affairs';
  if (/general.studies/i.test(text))                 return 'General Studies';
  return 'HRM Basics';
}
const category = categoryOverride || detectCategory(combined);

// Slug: derived from title
function makeSlug(str) {
  return str
    .toLowerCase()
    .replace(/['''"":]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
const slug = slugOverride || makeSlug(title) || `post-${Date.now()}`;

console.log(`   Title    : ${title}`);
console.log(`   Author   : ${authorName}`);
console.log(`   Category : ${category}`);
console.log(`   Slug     : ${slug}`);
console.log(`   Cover    : not generated by this script — rendering the hero banner to an`);
console.log(`              image needs a browser. Use Admin > Blog Posts > Import from HTML`);
console.log(`              instead for an auto-generated cover, or add one by hand after.`);

// ── DOM Transformations ───────────────────────────────────────────────────────
// Convert JS-driven accordion .acc-item → CSS-only <details>/<summary>
function transformAccordions(root) {
  root.querySelectorAll('.acc-item').forEach(item => {
    const trigger = item.querySelector('.acc-trigger');
    const body = item.querySelector('.acc-body');
    if (!trigger || !body) return;

    // Remove old JS arrow element
    trigger.querySelector('.acc-arrow')?.remove();

    const details = doc.createElement('details');
    details.className = 'acc-item';

    const summary = doc.createElement('summary');
    summary.className = 'acc-trigger';
    summary.innerHTML = trigger.innerHTML.trim();

    const bodyDiv = doc.createElement('div');
    bodyDiv.className = 'acc-body';
    bodyDiv.innerHTML = body.innerHTML;

    details.appendChild(summary);
    details.appendChild(bodyDiv);
    item.replaceWith(details);
  });
}

// Convert JS tab-based lifecycle → CSS-only stacked <details>
function transformLifecycle(root) {
  root.querySelectorAll('.lifecycle').forEach(lifecycle => {
    const tabs   = [...lifecycle.querySelectorAll('.lc-tab')];
    const panels = [...lifecycle.querySelectorAll('.lc-panel')];
    if (!panels.length) return;

    const newLifecycle = doc.createElement('div');
    newLifecycle.className = 'lifecycle';

    panels.forEach((panel, i) => {
      const tab = tabs[i];
      const details = doc.createElement('details');
      details.className = 'lc-stage';
      if (i === 0) details.setAttribute('open', '');

      const summary = doc.createElement('summary');
      summary.className = 'lc-tab';
      summary.innerHTML = tab ? tab.innerHTML : `<span class="lc-tab-label">Stage ${i + 1}</span>`;

      const content = doc.createElement('div');
      content.className = 'lc-panel';
      content.innerHTML = panel.innerHTML;

      details.appendChild(summary);
      details.appendChild(content);
      newLifecycle.appendChild(details);
    });

    lifecycle.replaceWith(newLifecycle);
  });
}

// Strip JS event-handler attributes
function removeEventHandlers(root) {
  const eventAttrs = ['onclick','onchange','oninput','onsubmit','onkeyup','onkeydown','onfocus','onblur','onload'];
  root.querySelectorAll('*').forEach(el => {
    eventAttrs.forEach(attr => el.removeAttribute(attr));
  });
}

// Apply transformations to the content area
const contentEl = doc.querySelector('.content');
const transformRoot = contentEl || doc.body;
transformAccordions(transformRoot);
transformLifecycle(transformRoot);
removeEventHandlers(transformRoot);

// ── Build the content HTML ────────────────────────────────────────────────────
let contentHtml = '';

// 1. Hero stats → preserve as-is (our CSS styles .hero-stats inside .blog-content)
const heroStats = doc.querySelector('.hero-stats');
if (heroStats) {
  contentHtml += heroStats.outerHTML + '\n';
}

// 2. Main section blocks — falls back progressively (.content → <main>/.main
//    minus hero & footer → full <body> minus hero & footer) so an unfamiliar
//    layout still brings the article text across instead of publishing empty.
let mainBodyHtml = '';
if (contentEl) {
  mainBodyHtml = contentEl.innerHTML.trim();
} else {
  console.warn('⚠️   .content element not found — falling back to <main>/<body> minus hero & footer.');
  const fallbackRoot = doc.querySelector('main, .main') || doc.body;
  const clone = fallbackRoot.cloneNode(true);
  clone.querySelector('.hero')?.remove();
  clone.querySelector('.footer')?.remove();
  clone.querySelectorAll('script, style').forEach(el => el.remove());
  mainBodyHtml = clone.innerHTML.trim();
}
if (mainBodyHtml) contentHtml += mainBodyHtml + '\n';

// Excerpt fallback: derive from the article body when there's no .hero-sub tagline.
if (!excerpt) {
  excerpt = mainBodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

// 3. Footer / author byline
const footerEl = doc.querySelector('.footer');
if (footerEl) {
  contentHtml += `<div class="blog-footer">\n${footerEl.innerHTML.trim()}\n</div>\n`;
}

// Tidy up
contentHtml = contentHtml
  .replace(/<!--[\s\S]*?-->/g, '')   // remove HTML comments
  .replace(/\n{3,}/g, '\n\n')
  .trim();

console.log(`\n✂️   Content size: ${(contentHtml.length / 1024).toFixed(1)} KB`);
console.log(`   Sections : ${(contentHtml.match(/class="section-block"/g) || []).length}`);
console.log(`   Lifecycle stages : ${(contentHtml.match(/class="lc-stage"/g) || []).length}`);
console.log(`   Accordions : ${(contentHtml.match(/<details class="acc-item"/g) || []).length}`);

// ── Insert into Supabase ──────────────────────────────────────────────────────
console.log('\n🔗  Connecting to Supabase…');
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Check for slug conflict
const { data: existing } = await supabase
  .from('blog_posts')
  .select('id, slug')
  .eq('slug', slug)
  .maybeSingle();

if (existing) {
  console.error(`\n❌  A blog post with slug "${slug}" already exists (id: ${existing.id}).`);
  console.error('    Use --slug "different-slug" to publish under a different URL.\n');
  process.exit(1);
}

const { data, error } = await supabase
  .from('blog_posts')
  .insert({
    title,
    slug,
    excerpt,
    content: contentHtml,
    category,
    author_name: authorName,
    published: shouldPublish,
  })
  .select('id, slug, published')
  .single();

if (error) {
  console.error('\n❌  Supabase insert failed:');
  console.error(`    ${error.message}\n`);
  if (error.message.toLowerCase().includes('security') || error.message.toLowerCase().includes('policy')) {
    console.error('    Tip: Add SUPABASE_SERVICE_ROLE_KEY to your .env to bypass RLS.\n');
  }
  process.exit(1);
}

const status = shouldPublish ? '✅  Published live!' : '📝  Saved as draft';
console.log(`\n${status}`);
console.log(`   Post ID  : ${data.id}`);
console.log(`   URL path : /blogs/${data.slug}`);
if (!shouldPublish) {
  console.log('\n   To publish: go to /admin/blogs and toggle Published on this post.');
  console.log(`   Or re-run with: npm run publish-blog -- "${filePath}" --publish\n`);
} else {
  console.log();
}
