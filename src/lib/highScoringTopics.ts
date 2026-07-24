import { getUnitForTopicSlug, unitRoman, type LWUnit } from "./labourWelfareUnits";

// A curated, editorial view over the UGC NET/JRF Paper II (Subject Code 55)
// syllabus — "which topics tend to carry the most exam weight" — layered on
// top of the official unit-wise structure in labourWelfareUnits.ts rather
// than replacing it. A high-scoring topic often spans more than one
// official unit (e.g. wages appear in both Unit II and Unit VIII), so it
// aggregates one or more of that file's topic slugs instead of being tied
// to a single unit.
//
// Frequency ratings are an initial editorial estimate based on how UGC NET
// Paper II Labour Welfare typically weights these areas (Labour Welfare,
// Wages, Industrial Relations and core HRM/OB recur most), not measured
// exam statistics — revisit as real question-paper data accumulates.

export type HSTCategoryValue =
  | "hrm"
  | "labour-welfare"
  | "industrial-relations"
  | "ob"
  | "labour-laws"
  | "hr-analytics"
  | "current-trends";

export const HST_CATEGORIES: { value: "all" | HSTCategoryValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "hrm", label: "HRM" },
  { value: "labour-welfare", label: "Labour Welfare" },
  { value: "industrial-relations", label: "Industrial Relations" },
  { value: "ob", label: "OB" },
  { value: "labour-laws", label: "Labour Laws" },
  { value: "hr-analytics", label: "HR Analytics" },
  { value: "current-trends", label: "Current Trends" },
];

export type HSTFrequency = "high" | "medium" | "low";

export const FREQUENCY_LABEL: Record<HSTFrequency, string> = {
  high: "High Frequency",
  medium: "Medium Frequency",
  low: "Low Frequency",
};

export type HighScoringTopic = {
  slug: string;
  name: string;
  category: HSTCategoryValue;
  frequency: HSTFrequency;
  // One or more topic slugs from labourWelfareUnits.ts (LW_TOPICS) whose
  // real notes/MCQs/lectures feed this card. Units covered are always
  // derived from this list (see getUnitsForTopic) so they can't drift out
  // of sync with the syllabus structure.
  topicSlugs: string[];
};

export const HIGH_SCORING_TOPICS: HighScoringTopic[] = [
  // ── HRM ──────────────────────────────────────────────────────────────
  { slug: "recruitment-selection-placement", name: "Recruitment, Selection & Placement", category: "hrm", frequency: "high", topicSlugs: ["u2-recruitment-selection-placement-induction"] },
  { slug: "performance-management-appraisal", name: "Performance Management & Appraisal", category: "hrm", frequency: "high", topicSlugs: ["u2-performance-management"] },
  { slug: "compensation-wages-incentives", name: "Compensation, Wages & Incentives", category: "hrm", frequency: "high", topicSlugs: ["u2-compensation-management", "u2-employee-benefits-and-incentives", "u8-concept-types-factors-influencing-wages"] },
  { slug: "training-and-development", name: "Training & Development", category: "hrm", frequency: "medium", topicSlugs: ["u2-training-and-development"] },
  { slug: "hr-planning-job-analysis", name: "HR Planning & Job Analysis", category: "hrm", frequency: "medium", topicSlugs: ["u2-human-resource-planning", "u2-job-analysis"] },

  // ── Labour Welfare ───────────────────────────────────────────────────
  { slug: "labour-welfare-concept-theories", name: "Concept, Scope & Theories of Labour Welfare", category: "labour-welfare", frequency: "high", topicSlugs: ["u9-concept-scope-types-of-labour-welfare", "u9-theories-and-principles"] },
  { slug: "social-security-schemes", name: "Social Security: Concept, Assistance & Assurance", category: "labour-welfare", frequency: "high", topicSlugs: ["u9-social-security-concept-and-scope", "u9-social-assistance-and-social-assurance"] },
  { slug: "industrial-health-safety-welfare", name: "Industrial Health, Safety & Occupational Diseases", category: "labour-welfare", frequency: "medium", topicSlugs: ["u9-industrial-health-and-hygiene", "u9-industrial-accidents-and-safety", "u9-occupational-diseases"] },

  // ── Industrial Relations ─────────────────────────────────────────────
  { slug: "collective-bargaining", name: "Collective Bargaining", category: "industrial-relations", frequency: "high", topicSlugs: ["u5-collective-bargaining"] },
  { slug: "trade-unions-evolution-law", name: "Trade Unions: Evolution, Structure & Law", category: "industrial-relations", frequency: "high", topicSlugs: ["u5-trade-unions-concepts-and-evolution", "u5-trade-unions-act-1926", "u5-problems-and-recognition-of-trade-unions"] },
  { slug: "workers-participation-grievance", name: "Workers' Participation & Grievance Handling", category: "industrial-relations", frequency: "medium", topicSlugs: ["u5-workers-participation-in-management", "u5-grievance-handling-and-disciplinary-action"] },

  // ── OB ────────────────────────────────────────────────────────────────
  { slug: "motivation-theories", name: "Motivation Theories", category: "ob", frequency: "high", topicSlugs: ["u4-motivation"] },
  { slug: "leadership-styles-theories", name: "Leadership Styles & Theories", category: "ob", frequency: "high", topicSlugs: ["u4-leadership"] },
  { slug: "group-dynamics-power-change", name: "Group Dynamics, Power & Organisational Change", category: "ob", frequency: "medium", topicSlugs: ["u4-group-dynamics", "u4-power-and-authority", "u4-organisational-change-and-development"] },

  // ── Labour Laws ──────────────────────────────────────────────────────
  { slug: "factories-act-1948", name: "The Factories Act, 1948", category: "labour-laws", frequency: "high", topicSlugs: ["u7-factories-act-1948"] },
  { slug: "minimum-wages-payment-of-wages-acts", name: "Minimum Wages Act & Payment of Wages Act", category: "labour-laws", frequency: "high", topicSlugs: ["u8-minimum-wages-act-1948", "u8-payment-of-wages-act-1936"] },
  { slug: "industrial-disputes-act-strikes-lockouts", name: "Industrial Disputes Act, 1947 & Strikes/Lockouts", category: "labour-laws", frequency: "high", topicSlugs: ["u6-industrial-disputes-act-1947", "u6-strikes-and-lockouts"] },
  { slug: "pf-gratuity-bonus-acts", name: "Provident Fund, Gratuity & Bonus Acts", category: "labour-laws", frequency: "medium", topicSlugs: ["u8-employees-provident-fund-act-1952", "u8-payment-of-gratuity-act-1972", "u8-payment-of-bonus-act-1965"] },

  // ── HR Analytics ─────────────────────────────────────────────────────
  { slug: "hr-analytics-hris-emerging-trends", name: "HR Analytics, HRIS & Emerging HRM Trends", category: "hr-analytics", frequency: "medium", topicSlugs: ["u3-human-resource-information-system", "u2-new-trends-and-emerging-concepts-in-hrm"] },

  // ── Current Trends ───────────────────────────────────────────────────
  { slug: "ihrm-cross-cultural-global-hr", name: "IHRM, Cross-Cultural Management & Global HR Trends", category: "current-trends", frequency: "medium", topicSlugs: ["u3-ihrm-organisational-context-and-functions", "u3-ihrm-and-sustainable-business", "u3-cross-cultural-studies-and-cultural-diversity"] },
  { slug: "ir-changing-scenario", name: "Industrial Relations in the Changing Scenario", category: "current-trends", frequency: "low", topicSlugs: ["u5-ir-in-changing-scenario"] },
];

export function getUnitsForTopic(topic: HighScoringTopic): LWUnit[] {
  const seen = new Set<number>();
  const units: LWUnit[] = [];
  for (const slug of topic.topicSlugs) {
    const u = getUnitForTopicSlug(slug);
    if (u && !seen.has(u.number)) {
      seen.add(u.number);
      units.push(u);
    }
  }
  return units.sort((a, b) => a.number - b.number);
}

export function unitsLabel(topic: HighScoringTopic): string {
  return getUnitsForTopic(topic).map(u => `Unit ${unitRoman(u.number)}`).join(", ");
}

export function getHighScoringTopicBySlug(slug: string | undefined): HighScoringTopic | undefined {
  return HIGH_SCORING_TOPICS.find(t => t.slug === slug);
}
