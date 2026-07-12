// Shared brand palette for generated (non-photographic) covers — quiz cards,
// PPT note thumbnails — so they all read as one designed poster system
// instead of drifting into per-page one-offs.

export const NAVY_HEX = "#1F4E79";
export const GOLD_HEX = "#C7994A";

// Per-subject cover gradient, built from the site's navy/steel/gold palette.
export const SUBJECT_GRADIENT: Record<string, [string, string]> = {
  hrm:     ["#1F4E79", "#0D2A45"],
  ob:      ["#3D6C98", "#1F4E79"],
  sm:      ["#A9823F", "#0D2A45"],
  pom:     ["#0D2A45", "#1F4E79"],
  bc:      ["#5B8AB8", "#1F4E79"],
  cgbe:    ["#1F4E79", "#3D6C98"],
  odcm:    ["#C7994A", "#A9823F"],
  ghr:     ["#0D2A45", "#3D6C98"],
  english: ["#3D6C98", "#0D2A45"],
};

export function subjectGradient(subjectValue?: string | null): [string, string] {
  return SUBJECT_GRADIENT[subjectValue || ""] || SUBJECT_GRADIENT.hrm;
}
