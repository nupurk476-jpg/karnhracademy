import { describe, it, expect } from "vitest";
import {
  normalizeForHash,
  questionHash,
  sanitizeCandidate,
  overallConfidence,
  cleanExtractedText,
  normalizeOptionKey,
} from "../normalize";
import type { CandidateQuestion } from "../types";

function candidate(overrides: Partial<CandidateQuestion> = {}): CandidateQuestion {
  return {
    number: 1,
    question_type: "mcq_single",
    stem: "What does OSI stand for?",
    options: [
      { key: "A", text: "Open Systems Interconnection" },
      { key: "B", text: "Open Software Interface" },
    ],
    correct_options: ["A"],
    answer_text: null,
    explanation: null,
    confidence: { stem: 0.9, options: 0.9, answer: 0.9 },
    warnings: [],
    ...overrides,
  };
}

describe("normalizeForHash", () => {
  it("collapses OCR noise so re-scans hash identically", () => {
    const a = normalizeForHash("What is  a “router”? ");
    const b = normalizeForHash('what is a "ROUTER"?');
    expect(a).toBe(b);
  });

  it("strips punctuation but keeps word content", () => {
    expect(normalizeForHash("TCP/IP — layer-4?")).toBe("tcp ip layer 4");
  });
});

describe("questionHash", () => {
  it("is stable regardless of option order", () => {
    const h1 = questionHash("Which layer routes packets?", [
      { text: "Network" },
      { text: "Transport" },
    ]);
    const h2 = questionHash("Which layer routes packets?", [
      { text: "Transport" },
      { text: "Network" },
    ]);
    expect(h1).toBe(h2);
  });

  it("differs for different stems", () => {
    expect(questionHash("Question one")).not.toBe(questionHash("Question two"));
  });
});

describe("sanitizeCandidate", () => {
  it("clears answers that reference nonexistent options and records a warning", () => {
    const result = sanitizeCandidate(candidate({ correct_options: ["D"] }));
    expect(result.correct_options).toBeNull();
    expect(result.warnings.some((w) => w.includes("does not match"))).toBe(true);
    expect(result.confidence.answer).toBeLessThanOrEqual(0.3);
  });

  it("never invents an answer for answerless questions", () => {
    const result = sanitizeCandidate(candidate({ correct_options: null }));
    expect(result.correct_options).toBeNull();
  });

  it("re-letters clashing option keys", () => {
    const result = sanitizeCandidate(
      candidate({
        options: [
          { key: "A", text: "First" },
          { key: "A", text: "Second" },
          { key: "B", text: "Third" },
        ],
        correct_options: null,
      }),
    );
    expect(result.options?.map((o) => o.key)).toEqual(["A", "B", "C"]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("normalizes messy option keys like '(a)'", () => {
    const result = sanitizeCandidate(
      candidate({
        options: [
          { key: "(a)", text: "One" },
          { key: "b.", text: "Two" },
        ],
        correct_options: ["(A)"],
      }),
    );
    expect(result.options?.map((o) => o.key)).toEqual(["A", "B"]);
    expect(result.correct_options).toEqual(["A"]);
  });

  it("upgrades mcq_single to mcq_multi when several answers exist", () => {
    const result = sanitizeCandidate(
      candidate({
        options: [
          { key: "A", text: "One" },
          { key: "B", text: "Two" },
          { key: "C", text: "Three" },
        ],
        correct_options: ["A", "C"],
      }),
    );
    expect(result.question_type).toBe("mcq_multi");
  });

  it("flags MCQs whose source had no options", () => {
    const result = sanitizeCandidate(candidate({ options: null, correct_options: null }));
    expect(result.warnings.some((w) => w.includes("No options"))).toBe(true);
  });
});

describe("overallConfidence", () => {
  it("weights assessed fields only", () => {
    expect(overallConfidence({ stem: 1, options: 1, answer: 1 })).toBe(1);
    expect(overallConfidence({})).toBeNull();
  });

  it("penalizes a shaky answer more than a shaky explanation", () => {
    const shakyAnswer = overallConfidence({ stem: 1, options: 1, answer: 0.2, explanation: 1 });
    const shakyExplanation = overallConfidence({ stem: 1, options: 1, answer: 1, explanation: 0.2 });
    expect(shakyAnswer!).toBeLessThan(shakyExplanation!);
  });
});

describe("cleanExtractedText", () => {
  it("de-hyphenates words broken across lines", () => {
    expect(cleanExtractedText("net-\nwork layer")).toBe("network layer");
  });

  it("normalizes CRLF and collapses blank runs", () => {
    expect(cleanExtractedText("a\r\n\r\n\r\n\r\nb")).toBe("a\n\nb");
  });
});

describe("normalizeOptionKey", () => {
  it.each([
    ["(a)", "A"],
    ["B.", "B"],
    ["c )", "C"],
    ["D", "D"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeOptionKey(input)).toBe(expected);
  });
});
