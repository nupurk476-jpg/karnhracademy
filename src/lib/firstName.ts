/**
 * Extract a usable greeting name.
 *
 * Mirrors the helper inside supabase/functions/send-welcome-email so the
 * rule is testable in this project's own test runner; the Edge Function
 * runs on Deno and is not covered by vitest.
 *
 * A greeting needs a first name -- not a full "Gagan Kumar Sharma", and
 * not an email prefix like "gk.sharma91". Anything that fails to look
 * like a name falls back to "there", because "Hello gk.sharma91" reads
 * worse than not personalising at all.
 */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  // Letters only, so an identifier-shaped prefix is rejected.
  // \p{M} matters as much as \p{L}: Devanagari vowel signs are Unicode
  // marks, not letters, so a letters-only pattern rejects every
  // Hindi-script name and greets those students with "there".
  if (first.length < 2 || !/^[\p{L}][\p{L}\p{M}'-]*$/u.test(first)) return "there";
  return first;
}
