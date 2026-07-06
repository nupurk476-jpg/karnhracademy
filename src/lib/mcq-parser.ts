// Parses multiple-choice questions out of plain text (typically extracted
// from a PDF). Understands the common formats teachers use:
//
//   1. Question text?            Q1) Question text
//   A) Option   (b) Option       a. Option
//   Answer: B   Ans - b          Correct answer: (B)
//   (B)                          *B) marked option   key: B
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
  qaFormatDetected: boolean; // true when the document uses Q./A. style, not A/B/C/D MCQ
};

const OPTION_RE = /^\s*\*?\s*\(?([A-Fa-f])[.):]\s+(.*?)(?:\s*\*\s*)?$/;
const QUESTION_RE = /^\s*(?:Q(?:uestion)?\s*[.\s]?\s*)?(\d{1,3})\s*[.):]\s*(.*)$/i;
// Matches "Answer: B", "Ans- b", "Correct answer: (B)", "Key: C", etc.
// The (?![A-Za-z0-9]) guard stops "Answer: Both..." matching as option B.
const ANSWER_RE = /^\s*(?:correct\s*(?:answer|option)?|answer|ans|key)\s*[\s:().\-]*([A-Fa-f1-6])(?![A-Za-z0-9]).*$/i;
// A bare letter on its own line: "(B)" or "B" or "B." — treated as the answer
// when we already have ≥2 options for the current question.
const STANDALONE_ANS_RE = /^\s*\(?([A-Fa-f])\)?\s*\.?\s*$/;
const EXPLANATION_RE = /^\s*(?:explanation|solution|reason|exp)\s*[:.\-]?\s*(.*)$/i;
// Must start at beginning of line (after whitespace) so "A  Answer Key" in a ToC
// doesn't prematurely trigger key-section mode.
const KEY_HEADER_RE = /^\s*(?:answer\s*key|answers?\s*:?\s*$|key\s*:?\s*$)/i;
const KEY_PAIR_RE = /(\d{1,3})\s*[.):\-–—]?\s*\(?([A-Fa-f])\)?(?![A-Za-z])/g;
// "Q1 Q2 Q3 … Q10" header line in a grid-style answer key table.
const KEY_TABLE_HEADER_RE = /^\s*(?:Q\d{1,3}\s+){2,}/i;
// A row of bare answer letters matching an earlier Q-number header: "B  C  A  D …"
const KEY_TABLE_LETTERS_RE = /^\s*(?:[A-Fa-f]\s+){2,}[A-Fa-f]\s*$/i;
// "Q1 — Correct Answer: B. Explanation text…" — common per-question explanation block.
const QNUM_ANSWER_EXPL_RE = /^\s*Q(\d{1,3})\s*[—\-–]\s*correct\s*answer\s*:\s*([A-Fa-f])\.\s*(.*)/i;
// Q. style question (Q&A / FAQ format, NOT numbered MCQ).
// "Q." followed by a non-digit word character — excludes "Q1.", "Q2." which ARE MCQ.
const QA_QUESTION_LINE_RE = /^\s*Q\.\s+\w/;

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

// Whether an option line is starred (correct answer marker):
//   *A) text  or  A) text *  or  A) text*
const isStarredOption = (raw: string): boolean =>
  /^\s*\*\s*\(?[A-Fa-f][.):]/i.test(raw) || /\*\s*$/.test(raw.trimEnd());

// PDF extraction often glues things onto one line; split them back apart.
const preSplit = (line: string): string[] => {
  let s = line;
  // Break before "Answer"/"Ans"/"Correct" keywords (even without colon/dash).
  // "Key" is only split when followed by a separator (Key: B), not bare "Key" which
  // can appear legitimately in option text ("Key Performance Indicator").
  s = s.replace(/(\S)\s+((?:correct\s*(?:answer|option)?|answer|ans)\b)/gi, "$1\n$2");
  s = s.replace(/(\S)\s+(key\s*[:.\-])/gi, "$1\n$2");
  s = s.replace(/\s+(?=(?:explanation|solution)\s*[:\-])/gi, "\n");
  // Break an inline option run "A) x B) y" / "(A) x (B) y" into separate lines.
  // Two-column PDFs produce exactly 2 markers per line (e.g. "(A) text  (B) text").
  // We also split when there are 3+ markers (standard inline runs).
  // Only trigger when the line STARTS with an option marker (guards against
  // splitting option text that merely contains something letter-paren-like mid-sentence).
  const markers = s.match(/(?:^|\s)\*?\s*\(?[A-Fa-f][.)]\s/g);
  const startsWithOpt = /^\s*\*?\s*\(?[A-Fa-f][.)]\s/.test(s);
  if (markers && (markers.length >= 3 || (markers.length >= 2 && startsWithOpt))) {
    s = s.replace(/\s{2,}(?=\*?\s*\(?[A-Fa-f][.)]\s)/g, "\n");
  }
  return s.split("\n");
};

export function parseMcqText(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/).flatMap(preSplit);

  const questions: ParsedMcq[] = [];
  const keyMap = new Map<number, number>();
  const explanationMap = new Map<number, string>(); // qnum → explanation text (from explanation section)
  let skipped = 0;
  let qaLineCount = 0; // counts "Q. text" style lines seen

  let cur: ParsedMcq | null = null;
  let mode: "question" | "option" | "explanation" | null = null;
  let keySection = false;
  // Track expected next option index so options must arrive in A→B→C→D order.
  // This prevents Q&A answers (each labeled A.) from being stacked as fake options.
  let nextOptIdx = 0;
  // Grid-style answer key: remember the Q-numbers from the header row so we can
  // match them to the letter row that follows.
  let keyTableQNums: number[] = [];

  const flush = () => {
    if (!cur) return;
    cur.question = cur.question.trim();
    cur.options = cur.options.map(o => o.trim()).filter(o => o.length > 0);
    if (cur.question && cur.options.length >= 2) questions.push(cur);
    else if (cur.question) skipped++;
    cur = null;
    mode = null;
    nextOptIdx = 0;
  };

  // Track last matched Q-number for continuation lines in the explanation section.
  let explQnum: number | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip page headers / footers that pdfjs extracts as standalone lines.
    // "Page 5" or "Page 5 of 13" at start of line.
    if (/^\s*Page\s+\d+(\s+of\s+\d+)?\s*$/i.test(line)) continue;
    // Academy header lines (long branding strings like "Karn HR Academy | …")
    if (/Karn HR Academy/i.test(line)) continue;

    if (KEY_HEADER_RE.test(line) && line.length < 60) { keySection = true; flush(); continue; }

    // Answer-key entries ("7. C", or many pairs on one line)
    if ((keySection || isKeyLine(line)) && isKeyLine(line)) {
      for (const m of line.matchAll(KEY_PAIR_RE)) keyMap.set(parseInt(m[1], 10), letterToIndex(m[2]));
      keyTableQNums = []; // reset grid state on a normal key line
      continue;
    }

    // Grid-style key table: "Q1  Q2  Q3  … Q10" header row
    if (KEY_TABLE_HEADER_RE.test(line)) {
      keySection = true; flush();
      keyTableQNums = Array.from(line.matchAll(/Q(\d{1,3})/gi), m => parseInt(m[1], 10));
      continue;
    }

    // Grid-style key table: letter row "B  C  A  D …" following a Q-number header
    if (keyTableQNums.length > 0 && KEY_TABLE_LETTERS_RE.test(line)) {
      const letters = line.trim().split(/\s+/);
      letters.forEach((ch, i) => {
        if (i < keyTableQNums.length) keyMap.set(keyTableQNums[i], letterToIndex(ch));
      });
      keyTableQNums = [];
      continue;
    }

    // Per-question explanation block: "Q1 — Correct Answer: B. Intrinsic compensation is…"
    // This also gives us the answer letter for questions that had no inline answer.
    const qae = line.match(QNUM_ANSWER_EXPL_RE);
    if (qae) {
      const qnum = parseInt(qae[1], 10);
      const ansIdx = letterToIndex(qae[2]);
      const explText = qae[3].trim();
      explQnum = qnum;
      // Store answer in keyMap (applied after all lines parsed)
      if (!keyMap.has(qnum)) keyMap.set(qnum, ansIdx);
      // Also store explanation — find matching question if already parsed
      const target = questions.find(q => q.number === qnum);
      if (target) {
        if (target.correct === null) target.correct = ansIdx;
        if (!target.explanation && explText) target.explanation = explText;
        else if (target.explanation && explText) target.explanation += " " + explText;
      } else {
        if (explText) explanationMap.set(qnum, (explanationMap.get(qnum) ?? "") + (explanationMap.has(qnum) ? " " : "") + explText);
      }
      continue;
    }

    // Continuation of an explanation block (text follows on the next line with no prefix).
    // We track `explQnum` to append it to the right question / explanationMap entry.
    if (explQnum !== null && !line.match(QUESTION_RE) && !line.match(OPTION_RE) && !line.match(KEY_TABLE_HEADER_RE)) {
      const target = questions.find(q => q.number === explQnum);
      if (target) {
        target.explanation = ((target.explanation ?? "") + " " + line).trim();
      } else {
        explanationMap.set(explQnum, ((explanationMap.get(explQnum) ?? "") + " " + line).trim());
      }
      continue;
    }
    // Any new question or option resets the explanation continuation context.
    if (line.match(QUESTION_RE) || line.match(OPTION_RE)) explQnum = null;

    // "Q. text" is a Q&A-style question (not an MCQ numbered question).
    // Flush whatever was being built and skip — we don't parse Q&A format as MCQ.
    // "Q1. text" is DIFFERENT (numbered) and is handled by QUESTION_RE below.
    if (QA_QUESTION_LINE_RE.test(line)) {
      qaLineCount++;
      flush();
      continue;
    }

    // Explicit answer keyword: "Answer: B", "Ans- C", "Key: D", etc.
    const ans = line.match(ANSWER_RE);
    if (ans && cur) { cur.correct = letterToIndex(ans[1]); mode = null; continue; }

    // Standalone letter line: "(B)" or just "B" — answer when ≥2 options already seen.
    if (cur && cur.options.length >= 2 && cur.correct === null) {
      const sa = line.match(STANDALONE_ANS_RE);
      if (sa) { cur.correct = letterToIndex(sa[1]); mode = null; continue; }
    }

    const exp = line.match(EXPLANATION_RE);
    if (exp && cur && cur.options.length >= 2) {
      cur.explanation = exp[1].trim() || null;
      mode = "explanation";
      continue;
    }

    const opt = line.match(OPTION_RE);
    if (opt && cur) {
      const optIdx = letterToIndex(opt[1]);
      // Enforce sequential A→B→C→D order. If optIdx doesn't match what's expected,
      // this "option" is likely a Q&A answer or out-of-context letter — treat as
      // continuation text instead.
      if (optIdx === nextOptIdx) {
        const optText = opt[2].replace(/\*\s*$/, "").trim();
        cur.options.push(optText);
        if (isStarredOption(rawLine)) cur.correct = cur.options.length - 1;
        nextOptIdx++;
        mode = "option";
        continue;
      }
      // Wrong order — fall through to continuation handling
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

  // Apply answer key and explanations to questions that didn't get them inline.
  for (const qq of questions) {
    if (qq.correct === null && qq.number !== null && keyMap.has(qq.number)) {
      qq.correct = keyMap.get(qq.number)!;
    }
    if (qq.correct !== null && qq.correct >= qq.options.length) qq.correct = null;
    if (!qq.explanation && qq.number !== null && explanationMap.has(qq.number)) {
      qq.explanation = explanationMap.get(qq.number)!;
    }
  }

  const qaFormatDetected = qaLineCount >= 3 && questions.length < qaLineCount / 2;
  return { questions, skipped, qaFormatDetected };
}
