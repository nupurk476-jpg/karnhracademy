/**
 * Inline the canonical email templates into the Edge Function.
 *
 * The function needs the HTML at runtime, and Supabase's bundler makes no
 * promise about shipping sibling non-code files, so the template is
 * compiled into a TypeScript module instead of read from disk. Generated
 * rather than duplicated by hand: two copies of a template drift, and the
 * one nobody edits is the one that gets sent.
 *
 * Run after changing anything in email-templates/:
 *   node scripts/sync-email-templates.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("email-templates/welcome.html", "utf8");
const text = readFileSync("email-templates/welcome.txt", "utf8");

// Backticks and ${ would end or escape the template literal.
const lit = (s) => "`" + s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";

const out = `// GENERATED FILE -- do not edit.
// Source: email-templates/welcome.html and welcome.txt
// Regenerate: node scripts/sync-email-templates.mjs

export const WELCOME_HTML = ${lit(html)};

export const WELCOME_TEXT = ${lit(text)};
`;

writeFileSync("supabase/functions/send-welcome-email/template.ts", out);
console.log(
  `template.ts written (${html.length} bytes html, ${text.length} bytes text)`,
);
