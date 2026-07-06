// Parses multiple-choice questions out of plain text (typically extracted
// from a PDF). Understands the common formats teachers use:
//
//   1. Question text?            Q1) Question text
//   A) Option   (b) Option       a. Option
//   Answer: B   Ans - b          Correct answer: (B)
//   Explanation: ...
//
// plus an "Answer Key" section at the end (1. A  2. C  3. B ...), inline
// option runs on a single line ("A) x B) y C) z D) w"), and multi-line
// question/option text.

export type ParsedMcq = {
  number: number | null;
  question: string;
  options: string[];
  correct: number | null; // index into options; null = not detected
  explanation: string | null;
};

export type ParseResult = {
  questions: ParsedMcq[];
  skipped: number; // blocks that looked like questions but had < 2 options
};

const OPTION_RE = /^\s*\(?([A-Fa-f])[.):]\s+(.*)$/;
const QUESTION_RE = /^\s*(?:Q(?:uestion)?\s*[.\s]?\s*)?(\d{1,3})\s*[.):]\s*(.*)$/i;
// The (?![A-Za-z0-9]) guard stops "Answer: Both..." matching as option B.
// Trailing text after the letter ("Answer: B) Key Performance Area") is allowed.
const ANSWER_RE = /^\s*(?:correct\s*(?:answer|option)?|answer|ans)\s*[\s:().-]*([A-Fa-f1-6])(?![A-Za-z0-9]).*$/i;
const EXPLANATION_RE = /^\s*(?:explanation|solution|reason|exp)\s*[:.\-]?\s*(.*)$/i;
const KEY_HEADER_RE = /answer\s*key|answers\s*:?\s*$/i;
const KEY_PAIR_RE = /(\d{1,3})\s*[.):\-–—]?\s*\(?([A-Fa-f])\)?(?![A-Za-z])/g;

const letterToIndex = (ch: string): number => {
  const c = ch.toUpperCase();
  if (c >= "A" && c <= "F") return c.charCodeAt(0) - 65;
  return parseInt(c, 10) - 1; // "1"-"6"
};

// A line consisting only of number→letter pairs, e.g. "1. A 2. C 3. B"
const isKeyLine = (line: string): boolean => {
  const stripped = line.replace(KEY_PAIR_RE, "").replace(/[\s,;|]+/g, "");
  const pairs = line.match(KEY_PAIR_RE);
  return !!pairs && pairs.length >= 1 && stripped.length === 0;
};

// PDF extraction often glues things onto one line; split them back apart.
const preSplit = (line: string): string[] => {
  let s = line;
  // break before "Answer:" / "Explanation:" when glued mid-line
  s = s.replace(/\s+(?=(?:correct\s*(?:answer|option)?|answer|ans)\s*[:\-])/gi, "\n");
  s = s.replace(/\s+(?=(?:explanation|solution)\s*[:\-])/gi, "\n");
  // break an inline option run "A) x B) y C) z" — only when 3+ markers present
  const markers = s.match(/(?:^|\s)\(?[A-Fa-f][.)]\s/g);
  if (markers && markers.length >= 3) {
    s = s.replace(/\s+(?=\(?[A-Fa-f][.)]\s)/g, "\n");
  }
  return s.split("\n");
};

export function parseMcqText(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/).flatMap(preSplit);

  const questions: ParsedMcq[] = [];
  const keyMap = new Map<number, number>();
  let skipped = 0;

  let cur: ParsedMcq | null = null;
  // which field trailing text should be appended to
  let mode: "question" | "option" | "explanation" | null = null;
  let keySection = false;

  const flush = () => {
    if (!cur) return;
    cur.question = cur.question.trim();
    cur.options = cur.options.map(o => o.trim()).filter(o => o.length > 0);
    if (cur.question && cur.options.length >= 2) questions.push(cur);
    else if (cur.question) skipped++;
    cur = null;
    mode = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (KEY_HEADER_RE.test(line) && line.length < 40) { keySection = true; flush(); continue; }

    // Answer-key entries ("7. C", or many pairs on one line)
    if ((keySection || isKeyLine(line)) && isKeyLine(line)) {
      for (const m of line.matchAll(KEY_PAIR_RE)) keyMap.set(parseInt(m[1], 10), letterToIndex(m[2]));
      continue;
    }

    const ans = line.match(ANSWER_RE);
    if (ans && cur) { cur.correct = letterToIndex(ans[1]); mode = null; continue; }

    const exp = line.match(EXPLANATION_RE);
    if (exp && cur && cur.options.length >= 2) {
      cur.explanation = exp[1].trim() || null;
      mode = "explanation";
      continue;
    }

    const opt = line.match(OPTION_RE);
    if (opt && cur) {
      cur.options.push(opt[2]);
      mode = "option";
      continue;
    }

    const q = line.match(QUESTION_RE);
    if (q && !(cur && mode === "option" && cur.options.length < 2)) {
      flush();
      cur = { number: parseInt(q[1], 10), question: q[2] || "", options: [], correct: null, explanation: null };
      mode = "question";
      continue;
    }

    // Plain continuation text — append to whatever we're building.
    if (cur) {
      if (mode === "question") cur.question += (cur.question ? " " : "") + line;
      else if (mode === "option" && cur.options.length > 0) cur.options[cur.options.length - 1] += " " + line;
      else if (mode === "explanation") cur.explanation = ((cur.explanation ?? "") + " " + line).trim();
    }
  }
  flush();

  // Apply the answer key to questions that didn't carry inline answers.
  for (const qq of questions) {
    if (qq.correct === null && qq.number !== null && keyMap.has(qq.number)) {
      qq.correct = keyMap.get(qq.number)!;
    }
    if (qq.correct !== null && qq.correct >= qq.options.length) qq.correct = null;
  }

  return { questions, skipped };
}
