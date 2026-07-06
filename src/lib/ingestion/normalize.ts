import { createHash } from "node:crypto";
import type { CandidateQuestion } from "./types";

/**
 * Text normalization used for duplicate detection. Aggressive on purpose:
 * two OCR runs of the same question should collapse to the same hash.
 */
export function normalizeForHash(text: string): string {
  return text
    .toLowerCase()
    // common OCR confusions
    .replace(/[’'`´‘]/g, "")
    .replace(/[“”"]/g, "")
    .replace(/[–—−]/g, "-")
    // strip everything that is not a letter, digit or space
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable content hash of a question (stem + sorted option texts). */
export function questionHash(stem: string, options?: { text: string }[] | null): string {
  const parts = [normalizeForHash(stem)];
  if (options?.length) {
    parts.push(
      ...options
        .map((o) => normalizeForHash(o.text))
        .filter(Boolean)
        .sort(),
    );
  }
  return createHash("sha1").update(parts.join("|")).digest("hex");
}

/** Clean common OCR / copy-paste artifacts without changing meaning. */
export function cleanExtractedText(raw: string): string {
  return (
    raw
      .replace(/\r\n?/g, "\n")
      .replace(/[   ]/g, " ")
      // de-hyphenate words broken across lines: "net-\nwork" → "network"
      .replace(/([a-z])-\n([a-z])/g, "$1$2")
      // collapse 3+ blank lines
      .replace(/\n{3,}/g, "\n\n")
      // strip trailing whitespace per line
      .replace(/[ \t]+$/gm, "")
  );
}

/** Normalize an option key: "(a)" | "a." | "A)" → "A". */
export function normalizeOptionKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

const CONFIDENCE_WEIGHTS = { stem: 0.4, options: 0.25, answer: 0.25, explanation: 0.1 };

/** Weighted overall confidence; only counts fields that were assessed. */
export function overallConfidence(c: CandidateQuestion["confidence"]): number | null {
  let weightSum = 0;
  let total = 0;
  for (const [field, weight] of Object.entries(CONFIDENCE_WEIGHTS)) {
    const value = c[field as keyof typeof c];
    if (typeof value === "number") {
      weightSum += weight;
      total += value * weight;
    }
  }
  if (weightSum === 0) return null;
  return Math.round((total / weightSum) * 1000) / 1000;
}

/**
 * Validate a candidate's internal consistency and repair what can be repaired
 * WITHOUT inventing data. Returns the candidate with added warnings.
 */
export function sanitizeCandidate(candidate: CandidateQuestion): CandidateQuestion {
  const c: CandidateQuestion = {
    ...candidate,
    warnings: [...candidate.warnings],
    options: candidate.options ? candidate.options.map((o) => ({ ...o })) : null,
    correct_options: candidate.correct_options ? [...candidate.correct_options] : null,
    confidence: { ...candidate.confidence },
  };

  c.stem = c.stem.trim();

  if (c.options) {
    c.options = c.options
      .map((o) => ({ key: normalizeOptionKey(o.key), text: o.text.trim() }))
      .filter((o) => o.text.length > 0);
    if (c.options.length === 0) c.options = null;
  }

  // Deduplicate option keys — OCR sometimes repeats "A".
  if (c.options) {
    const seen = new Set<string>();
    let clash = false;
    for (const o of c.options) {
      if (seen.has(o.key)) clash = true;
      seen.add(o.key);
    }
    if (clash) {
      const letters = "ABCDEFGHIJ";
      c.options = c.options.map((o, i) => ({ ...o, key: letters[i] ?? String(i + 1) }));
      c.warnings.push("Option labels were inconsistent in the source and were re-lettered.");
      c.confidence.options = Math.min(c.confidence.options ?? 1, 0.6);
    }
  }

  if (c.correct_options) {
    c.correct_options = c.correct_options.map(normalizeOptionKey).filter(Boolean);
    if (c.options) {
      const valid = new Set(c.options.map((o) => o.key));
      const bad = c.correct_options.filter((k) => !valid.has(k));
      if (bad.length > 0) {
        c.warnings.push(
          `Answer "${bad.join(", ")}" does not match any option — answer cleared for review.`,
        );
        c.correct_options = c.correct_options.filter((k) => valid.has(k));
        c.confidence.answer = Math.min(c.confidence.answer ?? 1, 0.3);
      }
    }
    if (c.correct_options.length === 0) c.correct_options = null;
  }

  // Type consistency
  if (c.question_type === "mcq_single" && (c.correct_options?.length ?? 0) > 1) {
    c.question_type = "mcq_multi";
  }
  if ((!c.options || c.options.length < 2) && c.question_type.startsWith("mcq")) {
    if (c.options === null) {
      c.warnings.push("No options found in the source — needs review.");
    } else {
      c.warnings.push("Fewer than two options found — options may be incomplete.");
      c.confidence.options = Math.min(c.confidence.options ?? 1, 0.4);
    }
  }

  if (c.explanation) {
    c.explanation = c.explanation.trim() || null;
  }
  if (c.answer_text) {
    c.answer_text = c.answer_text.trim() || null;
  }

  return c;
}
