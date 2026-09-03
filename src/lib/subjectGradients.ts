// Shared brand palette for generated (non-photographic) covers — quiz cards,
// PPT note thumbnails — so they all read as one designed poster system
// instead of drifting into per-page one-offs.

export const NAVY_HEX = "#17181C";
export const GOLD_HEX = "#E34234";

// Per-subject cover gradient, built from the site's navy/steel/gold palette.
export const SUBJECT_GRADIENT: Record<string, [string, string]> = {
  hrm:     ["#17181C", "#0B0C0E"],
  ob:      ["#4A4A4F", "#17181C"],
  sm:      ["#B23223", "#0B0C0E"],
  pom:     ["#0B0C0E", "#17181C"],
  bc:      ["#6B6B70", "#17181C"],
  odcm:    ["#E34234", "#B23223"],
  ghr:     ["#0B0C0E", "#4A4A4F"],
};

export function subjectGradient(subjectValue?: string | null): [string, string] {
  return SUBJECT_GRADIENT[subjectValue || ""] || SUBJECT_GRADIENT.hrm;
}

// Deterministic string hash (DJB2 variant) — the same seed always produces
// the same "random" shift, so a given topic's cover never changes between
// renders, but different topics land on visibly different colors.
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100, lf = l / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Nudges a hex color's hue/lightness/saturation by an amount derived from
// `seed`, so the result stays recognizably part of the same color family
// (brand palette) while still reading as clearly, visibly distinct — not
// just technically-different-in-the-hex-value.
function shiftColor(hex: string, seed: number): string {
  const [h, s, l] = hexToHsl(hex);
  const hueShift = (seed % 56) - 28; // ±28°
  const satShift = ((seed >> 6) % 30) - 15; // ±15%
  const lightShift = ((seed >> 11) % 24) - 12; // ±12%
  const newH = (h + hueShift + 360) % 360;
  const newS = Math.min(90, Math.max(25, s + satShift));
  const newL = Math.min(76, Math.max(16, l + lightShift));
  return hslToHex(newH, newS, newL);
}

// Per-note cover gradient: starts from the subject's base gradient (so it's
// still instantly recognizable as "an HRM note" etc.) but nudges the hue,
// saturation and lightness by a hash of `seed`. `seed` should be something
// unique to the individual file (its storage URL, ideally) rather than the
// topic — many different uploaded notes share the same broad topic (e.g. a
// dozen PPTs all filed under "Motivation"), and keying purely off topic
// would make all of them render identically.
export function topicGradient(subjectValue: string | null | undefined, seed: string): [string, string] {
  const [from, to] = subjectGradient(subjectValue);
  if (!seed) return [from, to];
  const hash = hashString(seed);
  return [shiftColor(from, hash), shiftColor(to, hash >> 4)];
}
