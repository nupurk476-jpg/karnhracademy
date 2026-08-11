// Small formatting helpers duplicated identically across 4+ pages
// (formatDate) and 2+ pages (the mm:ss clock) — collected here so a
// future locale/format change is a one-line edit instead of a sweep.

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// "3:05" — a countdown-style clock, used where elapsed/remaining time is
// read at a glance during or right after a timed quiz.
export const formatClock = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// "3m 5s" / "45s" — a human-readable duration, used in summary contexts
// (profile stats) rather than a live-updating clock.
export const formatDuration = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// Cleans up a title that was entered (or defaulted) as a raw filename —
// "UGC-NET-HR-June-2025-Question-Paper.pdf" → "UGC NET HR June 2025
// Question Paper" — so a student reads a title, not a file-naming
// convention. Only touches strings that actually look like filenames
// (a file extension, or hyphens/underscores standing in for spaces);
// a normal human-written title passes through untouched.
const FILE_EXT_RE = /\.(pdf|docx?|pptx?|xlsx?)$/i;
export const humanizeTitle = (title: string) => {
  const looksLikeFilename = FILE_EXT_RE.test(title) || (/[-_]/.test(title) && !/\s/.test(title));
  if (!looksLikeFilename) return title;
  return title
    .replace(FILE_EXT_RE, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
