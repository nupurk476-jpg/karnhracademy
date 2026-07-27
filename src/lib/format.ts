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
