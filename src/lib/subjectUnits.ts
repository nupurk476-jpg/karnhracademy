import { LW_UNITS, resolveLWTopicSlug } from "./labourWelfareUnits";
import { MBA_ECO_UNITS, BBA_ECO_UNITS } from "./economicsUnits";

// Unit-based subjects: their syllabus is a list of units, each holding topics.
// The admin groups the topic picker by unit for these; everything else shows
// a flat topic list.
export type SubjectUnit = { number: number; title: string; topics: { label: string; slug: string }[] };

const UNITS: Record<string, SubjectUnit[]> = {
  lw: LW_UNITS,
  "mba-eco": MBA_ECO_UNITS,
  "bba-eco": BBA_ECO_UNITS,
};

export function getUnitsForSubject(subject: string | null | undefined): SubjectUnit[] | undefined {
  return subject ? UNITS[subject] : undefined;
}

export function isUnitBasedSubject(subject: string | null | undefined): boolean {
  return !!getUnitsForSubject(subject);
}

export function getUnitForSubjectSlug(subject: string | null | undefined, slug: string | null | undefined): SubjectUnit | undefined {
  const units = getUnitsForSubject(subject);
  if (!units || !slug) return undefined;
  const resolved = subject === "lw" ? resolveLWTopicSlug(slug) : slug;
  return units.find(u => u.topics.some(t => t.slug === resolved));
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export function unitRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
