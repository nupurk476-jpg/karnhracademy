import { describe, it, expect } from "vitest";
import {
  isQuestionStart,
  chunkByQuestions,
  detectAnswerKeySection,
  parseKeyPairs,
  assessText,
  findSourcePage,
} from "../heuristics";

describe("isQuestionStart", () => {
  it.each([
    ["1. What is a router?", 1],
    ["Q2) Define subnetting", 2],
    ["Question 12: Explain NAT", 12],
    ["15 - Which protocol...", 15],
  ])("detects %s", (line, expected) => {
    expect(isQuestionStart(line)).toBe(expected);
  });

  it("rejects prose lines", () => {
    expect(isQuestionStart("The OSI model has 7 layers.")).toBeNull();
    expect(isQuestionStart("A. An option line")).toBeNull();
  });
});

describe("chunkByQuestions", () => {
  it("returns single chunk for short text", () => {
    expect(chunkByQuestions("short text", 9000)).toEqual(["short text"]);
  });

  it("splits at question boundaries, never mid-question", () => {
    const question = (n: number) =>
      `${n}. What is question number ${n}?\nA. Option one\nB. Option two\nAns: A\n`;
    const text = Array.from({ length: 40 }, (_, i) => question(i + 1)).join("\n");
    const chunks = chunkByQuestions(text, 800);

    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk after the first must begin at a question boundary.
    for (const chunk of chunks.slice(1)) {
      expect(isQuestionStart(chunk.split("\n")[0])).not.toBeNull();
    }
    // No content lost.
    expect(chunks.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });
});

describe("detectAnswerKeySection", () => {
  it("parses a compact answer key with heading", () => {
    const text = [
      "1. What is a hub?",
      "A. Device B. Cable",
      "2. What is a switch?",
      "A. Device B. Cable",
      "Answer Key",
      "1. A  2. B  3. C  4. D",
    ].join("\n");

    const section = detectAnswerKeySection(text);
    expect(section).not.toBeNull();
    expect(section!.entries).toHaveLength(4);
    expect(section!.entries[0]).toMatchObject({ number: 1, correct_options: ["A"] });
    expect(section!.entries[3]).toMatchObject({ number: 4, correct_options: ["D"] });
  });

  it("parses one-per-line key formats", () => {
    const text = ["ANSWERS", "1) b", "2) c", "3) a"].join("\n");
    const section = detectAnswerKeySection(text);
    expect(section).not.toBeNull();
    expect(section!.entries.map((e) => e.correct_options?.[0])).toEqual(["B", "C", "A"]);
  });

  it("ignores stray 'answers' headings without key pairs", () => {
    const text = "Answers\nThis paragraph merely discusses how answers are graded in exams over several sentences.";
    expect(detectAnswerKeySection(text)).toBeNull();
  });

  it("returns null when no key exists", () => {
    expect(detectAnswerKeySection("1. A question?\nA. one\nB. two")).toBeNull();
  });
});

describe("parseKeyPairs", () => {
  it("parses grid format", () => {
    const entries = parseKeyPairs("1.B 2.C 3.A 4.D 5.B");
    expect(entries).toHaveLength(5);
    expect(entries[1]).toMatchObject({ number: 2, correct_options: ["C"] });
  });

  it("keeps first occurrence on duplicates", () => {
    const entries = parseKeyPairs("1.B 1.C");
    expect(entries).toHaveLength(1);
    expect(entries[0].correct_options).toEqual(["B"]);
  });
});

describe("assessText", () => {
  it("flags scanned PDFs by low chars per page", () => {
    const shape = assessText("[[Page 1]]\nab\n[[Page 2]]\ncd", 2);
    expect(shape.looksScanned).toBe(true);
  });

  it("accepts normal documents", () => {
    const body = "1. A real question with plenty of text? ".repeat(30);
    const shape = assessText(`[[Page 1]]\n${body}`, 1);
    expect(shape.looksScanned).toBe(false);
  });
});

describe("findSourcePage", () => {
  it("locates the page marker preceding a stem", () => {
    const raw = `[[Page 1]]\nIntro text\n[[Page 2]]\nWhat is the default subnet mask of a class C network?`;
    expect(findSourcePage(raw, "What is the default subnet mask of a class C network?")).toBe(2);
  });

  it("returns null when the stem is not found", () => {
    expect(findSourcePage("[[Page 1]] other content", "Completely different question text here")).toBeNull();
  });
});
