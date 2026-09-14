// Small formatting helpers duplicated identically across 4+ pages
// (formatDate) and 2+ pages (the mm:ss clock) — collected here so a
// future locale/format change is a one-line edit instead of a sweep.

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// "14 Sep 2026, 5:32 pm" — date *and* wall-clock time, for admin screens
// where two entries a few minutes apart have to be told apart. formatDate
// deliberately omits the time; this is its sibling for when it matters.
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

// "just now" / "12 min ago" / "3 hr ago", handing off to timeAgo past a day.
// timeAgo collapses everything inside 24 hours to "today", which is no use
// when you're reading a list of errors to work out whether one is still
// happening right now or stopped this morning.
export const timeAgoPrecise = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 0) return "just now";        // clock skew between client and server
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return timeAgo(iso);
};

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
// "3 days ago" / "2 weeks ago" — for "recently added" lists where the
// exact date matters less than how fresh the item is.
export const timeAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} month${months > 1 ? "s" : ""} ago` : formatDate(iso);
};

// Titles typed in ALL CAPS in the admin ("PERFORMANCE MANAGEMENT PPT UNIT 2")
// come out as Title Case, with known acronyms kept upper-case. A title with
// normal mixed case passes through untouched.
const ACRONYMS = new Set(["HRM", "HR", "OB", "SM", "POM", "BC", "OD", "CM", "ODCM", "IHRM", "GHR", "UGC", "NET", "JRF", "MBA", "BBA", "PGDM", "MCQ", "MCQS", "PPT", "PDF", "PYQ", "PYQS", "II", "III", "IV", "VI", "VII", "VIII", "IX", "X", "SHRM", "HRIS", "KPI", "KPIS", "SWOT", "LPG", "WTO", "FDI", "ILO", "ESI", "PF", "AI", "DEI", "CSR", "TQM", "MNC", "MNCS"]);
export const tidyTitle = (title: string) => {
  const t = humanizeTitle(title);
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (!letters || letters !== letters.toUpperCase()) return t;
  return t.split(/(\s+)/).map(w => {
    const bare = w.replace(/[^A-Za-z]/g, "");
    if (!bare) return w;
    if (ACRONYMS.has(bare.toUpperCase())) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join("");
};

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
