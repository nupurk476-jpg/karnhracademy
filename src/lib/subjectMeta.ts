// Per-subject presentation metadata that doesn't belong in disciplines.ts:
// which exams a subject serves (shown as tags on subject cards) and where
// its hub lives (unit-based subjects have their own pages; the rest open
// the notes browser pre-filtered).

// `code` is the short watermark drawn on the subject cover. `image` (a path
// under /public, e.g. "/subjects/hrm.jpg") replaces the generated cover art
// with a photo — only use images the academy holds a licence for.
export type SubjectMeta = { exams: string[]; hub: string; code: string; units?: number; image?: string };

const META: Record<string, SubjectMeta> = {
  hrm:       { exams: ["MBA", "BBA", "UGC NET"], hub: "/notes?subject=hrm",  code: "HRM" },
  ob:        { exams: ["MBA", "BBA", "UGC NET"], hub: "/notes?subject=ob",   code: "OB" },
  sm:        { exams: ["MBA", "BBA"],            hub: "/notes?subject=sm",   code: "SM" },
  pom:       { exams: ["MBA", "BBA", "B.Com"],   hub: "/notes?subject=pom",  code: "POM" },
  bc:        { exams: ["MBA", "BBA", "B.Com"],   hub: "/notes?subject=bc",   code: "BC" },
  odcm:      { exams: ["MBA", "UGC NET"],        hub: "/notes?subject=odcm", code: "OD" },
  ghr:       { exams: ["MBA", "UGC NET"],        hub: "/notes?subject=ghr",  code: "IHRM" },
  "mba-eco": { exams: ["MBA", "PGDM"],           hub: "/mba-economics",      code: "ECO", units: 5 },
  "bba-eco": { exams: ["BBA", "B.Com"],          hub: "/bba-economics",      code: "ECO", units: 5 },
  lw:        { exams: ["UGC NET", "JRF"],        hub: "/ugc-net-labour-welfare", code: "LW", units: 10 },
};

export function getSubjectMeta(value: string): SubjectMeta {
  return META[value] ?? { exams: ["MBA", "BBA"], hub: `/notes?subject=${value}`, code: value.toUpperCase().slice(0, 4) };
}
