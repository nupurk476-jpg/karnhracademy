import { getUnitForTopicSlug, unitRoman, type LWUnit } from "./labourWelfareUnits";

// A curated, editorial view over the UGC NET/JRF Paper II (Subject Code 55)
// syllabus — "which topics tend to carry the most exam weight" — layered on
// top of the official unit-wise structure in labourWelfareUnits.ts rather
// than replacing it. A high-scoring topic often spans more than one
// official unit (e.g. wages appear in both Unit II and Unit VIII), so it
// aggregates one or more of that file's topic slugs instead of being tied
// to a single unit. Several fine-grained topics (e.g. every individual
// motivation theory) intentionally share the same underlying topic slug —
// the syllabus itself, and therefore the notes/MCQs uploaded against it,
// aren't broken down any finer than "Motivation" — so their real resource
// counts will be identical siblings of one shared content pool. That's
// expected, not a bug: each card is still a distinct, keyword-matched
// entry point for exam-focused search and revision.
//
// Frequency and read-time ratings are an initial editorial estimate based
// on how UGC NET Paper II Labour Welfare typically weights these areas
// (Labour Welfare, Wages, Industrial Relations and core HRM/OB recur
// most), not measured exam statistics or word counts — revisit as real
// question-paper data accumulates.

export type HSTCategoryValue =
  | "hrm"
  | "hrd"
  | "ob"
  | "labour-welfare"
  | "industrial-relations"
  | "labour-laws"
  | "hr-analytics"
  | "current-trends";

export const HST_CATEGORIES: { value: "all" | HSTCategoryValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "hrm", label: "HRM" },
  { value: "hrd", label: "HRD" },
  { value: "ob", label: "OB" },
  { value: "labour-welfare", label: "Labour Welfare" },
  { value: "industrial-relations", label: "Industrial Relations" },
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

export const HST_FREQUENCIES: { value: "all" | HSTFrequency; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High Frequency" },
  { value: "medium", label: "Medium Frequency" },
  { value: "low", label: "Low Frequency" },
];

// A qualitative (not a fabricated specific count) read on how often this
// topic tends to come up in the exam — we don't have historical
// question-paper analytics to back a specific number like "10+ papers",
// so this stays honest about being a general signal derived from the
// curated frequency rating above, not a measured statistic.
export const PYQ_FREQUENCY_LABEL: Record<HSTFrequency, string> = {
  high: "Very Frequently Asked",
  medium: "Occasionally Asked",
  low: "Rarely Asked",
};

export type HighScoringTopic = {
  slug: string;
  name: string;
  category: HSTCategoryValue;
  frequency: HSTFrequency;
  // Editorial estimate of study time for this topic's material, in minutes.
  readTimeMinutes: number;
  // One or more topic slugs from labourWelfareUnits.ts (LW_TOPICS) whose
  // real notes/MCQs/lectures feed this card. Units covered are always
  // derived from this list (see getUnitsForTopic) so they can't drift out
  // of sync with the syllabus structure.
  topicSlugs: string[];
};

export const HIGH_SCORING_TOPICS: HighScoringTopic[] = [
  // ── Recruitment, Selection & Placement ──────────────────────────────
  { slug: "recruitment", name: "Recruitment", category: "hrm", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u2-recruitment-selection-placement-induction"] },
  { slug: "selection", name: "Selection", category: "hrm", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u2-recruitment-selection-placement-induction"] },
  { slug: "placement", name: "Placement", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-recruitment-selection-placement-induction"] },
  { slug: "interview-techniques", name: "Interview Techniques", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-recruitment-selection-placement-induction"] },
  { slug: "selection-tests", name: "Selection Tests", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-recruitment-selection-placement-induction"] },
  { slug: "assessment-centre-selection", name: "Assessment Centre (Selection)", category: "hrm", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u2-recruitment-selection-placement-induction"] },
  { slug: "psychometric-tests", name: "Psychometric Tests", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-recruitment-selection-placement-induction"] },

  // ── HR Planning & Job Analysis ───────────────────────────────────────
  { slug: "human-resource-planning", name: "Human Resource Planning", category: "hrm", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u2-human-resource-planning"] },
  { slug: "job-analysis", name: "Job Analysis", category: "hrm", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u2-job-analysis"] },
  { slug: "job-design", name: "Job Design", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-job-analysis"] },
  { slug: "job-evaluation", name: "Job Evaluation", category: "hrm", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u2-job-evaluation"] },

  // ── Performance Management ───────────────────────────────────────────
  { slug: "performance-management", name: "Performance Management", category: "hrm", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u2-performance-management"] },
  { slug: "performance-appraisal", name: "Performance Appraisal", category: "hrm", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u2-performance-management"] },
  { slug: "360-degree-feedback", name: "360 Degree Feedback", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-performance-management"] },
  { slug: "mbo", name: "MBO (Management by Objectives)", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-performance-management"] },
  { slug: "bars", name: "BARS (Behaviourally Anchored Rating Scales)", category: "hrm", frequency: "low", readTimeMinutes: 10, topicSlugs: ["u2-performance-management"] },
  { slug: "assessment-centre-performance", name: "Assessment Centre (Performance Appraisal)", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-performance-management"] },
  { slug: "kpi-kra", name: "KPI & KRA", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-performance-management"] },
  { slug: "balanced-scorecard", name: "Balanced Scorecard", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-performance-management"] },

  // ── Compensation, Wages & Incentives ─────────────────────────────────
  { slug: "compensation-management", name: "Compensation Management", category: "hrm", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u2-compensation-management"] },
  { slug: "wage-determination", name: "Wage Determination", category: "hrm", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u8-concept-types-factors-influencing-wages"] },
  { slug: "wage-theories", name: "Wage Theories", category: "hrm", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u8-wage-theories-and-wage-differentials"] },
  { slug: "incentive-plans", name: "Incentive Plans", category: "hrm", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u2-employee-benefits-and-incentives"] },
  { slug: "executive-compensation", name: "Executive Compensation", category: "hrm", frequency: "low", readTimeMinutes: 10, topicSlugs: ["u2-compensation-management"] },

  // ── Motivation Theories ───────────────────────────────────────────────
  { slug: "maslow-need-hierarchy-theory", name: "Maslow's Need Hierarchy Theory", category: "ob", frequency: "high", readTimeMinutes: 10, topicSlugs: ["u4-motivation"] },
  { slug: "herzberg-two-factor-theory", name: "Herzberg's Two-Factor Theory", category: "ob", frequency: "high", readTimeMinutes: 10, topicSlugs: ["u4-motivation"] },
  { slug: "mcgregor-theory-x-y", name: "McGregor's Theory X & Theory Y", category: "ob", frequency: "high", readTimeMinutes: 10, topicSlugs: ["u4-motivation"] },
  { slug: "mcclelland-need-theory", name: "McClelland's Need Theory", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-motivation"] },
  { slug: "vroom-expectancy-theory", name: "Vroom's Expectancy Theory", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-motivation"] },
  { slug: "porter-lawler-model", name: "Porter–Lawler Model", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-motivation"] },
  { slug: "adams-equity-theory", name: "Adams' Equity Theory", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-motivation"] },
  { slug: "skinner-reinforcement-theory", name: "Skinner's Reinforcement Theory", category: "ob", frequency: "low", readTimeMinutes: 10, topicSlugs: ["u4-motivation"] },

  // ── Leadership Styles & Theories ─────────────────────────────────────
  { slug: "trait-theory-of-leadership", name: "Trait Theory of Leadership", category: "ob", frequency: "high", readTimeMinutes: 10, topicSlugs: ["u4-leadership"] },
  { slug: "behavioural-theory-of-leadership", name: "Behavioural Theory of Leadership", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-leadership"] },
  { slug: "contingency-theory-of-leadership", name: "Contingency Theory of Leadership", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-leadership"] },
  { slug: "fiedler-contingency-model", name: "Fiedler Contingency Model", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-leadership"] },
  { slug: "hersey-blanchard-situational-leadership", name: "Hersey–Blanchard Situational Leadership", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-leadership"] },
  { slug: "path-goal-theory", name: "Path–Goal Theory", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-leadership"] },
  { slug: "transformational-leadership", name: "Transformational Leadership", category: "ob", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u4-leadership"] },
  { slug: "transactional-leadership", name: "Transactional Leadership", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-leadership"] },

  // ── Industrial Relations ─────────────────────────────────────────────
  { slug: "collective-bargaining", name: "Collective Bargaining", category: "industrial-relations", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u5-collective-bargaining"] },
  { slug: "trade-unions", name: "Trade Unions", category: "industrial-relations", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u5-trade-unions-concepts-and-evolution", "u5-trade-unions-act-1926", "u5-problems-and-recognition-of-trade-unions"] },
  { slug: "workers-participation", name: "Workers' Participation", category: "industrial-relations", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u5-workers-participation-in-management"] },
  { slug: "grievance-handling", name: "Grievance Handling", category: "industrial-relations", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u5-grievance-handling-and-disciplinary-action"] },
  { slug: "discipline", name: "Discipline", category: "industrial-relations", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u5-grievance-handling-and-disciplinary-action", "u5-code-of-conduct"] },
  { slug: "industrial-democracy", name: "Industrial Democracy", category: "industrial-relations", frequency: "low", readTimeMinutes: 10, topicSlugs: ["u5-workers-participation-in-management"] },

  // ── Labour Laws ──────────────────────────────────────────────────────
  { slug: "factories-act-1948", name: "Factories Act, 1948", category: "labour-laws", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u7-factories-act-1948"] },
  { slug: "trade-union-act-1926", name: "Trade Union Act, 1926", category: "labour-laws", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u5-trade-unions-act-1926"] },
  { slug: "industrial-disputes-act-1947", name: "Industrial Disputes Act, 1947", category: "labour-laws", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u6-industrial-disputes-act-1947"] },
  { slug: "strikes-and-lockouts", name: "Strikes and Lockouts", category: "labour-laws", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u6-strikes-and-lockouts"] },
  { slug: "minimum-wages-act-1948", name: "Minimum Wages Act, 1948", category: "labour-laws", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u8-minimum-wages-act-1948"] },
  { slug: "payment-of-wages-act-1936", name: "Payment of Wages Act, 1936", category: "labour-laws", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u8-payment-of-wages-act-1936"] },
  { slug: "payment-of-bonus-act-1965", name: "Payment of Bonus Act, 1965", category: "labour-laws", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u8-payment-of-bonus-act-1965"] },
  { slug: "payment-of-gratuity-act-1972", name: "Payment of Gratuity Act, 1972", category: "labour-laws", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u8-payment-of-gratuity-act-1972"] },
  { slug: "employees-compensation-act-1923", name: "Employees' Compensation Act, 1923", category: "labour-laws", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u9-social-security-concept-and-scope"] },
  { slug: "esi-act-1948", name: "Employees' State Insurance Act, 1948 (ESI)", category: "labour-laws", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u9-social-security-concept-and-scope"] },
  { slug: "epf-act-1952", name: "Employees' Provident Fund Act, 1952 (EPF)", category: "labour-laws", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u8-employees-provident-fund-act-1952"] },
  { slug: "maternity-benefit-act-1961", name: "Maternity Benefit Act, 1961", category: "labour-laws", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u9-social-security-concept-and-scope"] },
  { slug: "equal-remuneration-act-1976", name: "Equal Remuneration Act, 1976", category: "labour-laws", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u8-equal-remuneration-act-1976"] },
  { slug: "osh-code-2020", name: "Occupational Safety, Health & Working Conditions Code, 2020", category: "labour-laws", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u9-industrial-health-and-hygiene", "u9-industrial-accidents-and-safety"] },
  { slug: "ir-code-2020", name: "Industrial Relations Code, 2020", category: "labour-laws", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u6-industrial-disputes-act-1947", "u5-trade-unions-act-1926"] },
  { slug: "code-on-wages-2019", name: "Code on Wages, 2019", category: "labour-laws", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u8-concept-types-factors-influencing-wages"] },
  { slug: "code-on-social-security-2020", name: "Code on Social Security, 2020", category: "labour-laws", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u9-social-security-concept-and-scope"] },

  // ── HRM: talent, careers & modern practice ───────────────────────────
  { slug: "competency-mapping", name: "Competency Mapping", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-new-trends-and-emerging-concepts-in-hrm"] },
  { slug: "talent-management", name: "Talent Management", category: "hrm", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u2-new-trends-and-emerging-concepts-in-hrm"] },
  { slug: "succession-planning", name: "Succession Planning", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-managing-career"] },
  { slug: "career-planning", name: "Career Planning", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-managing-career"] },
  { slug: "employee-engagement", name: "Employee Engagement", category: "hrm", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u2-new-trends-and-emerging-concepts-in-hrm"] },
  { slug: "employee-retention", name: "Employee Retention", category: "hrm", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-new-trends-and-emerging-concepts-in-hrm"] },
  { slug: "strategic-hrm", name: "Strategic HRM", category: "hrm", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u2-new-trends-and-emerging-concepts-in-hrm"] },

  // ── HRD ──────────────────────────────────────────────────────────────
  { slug: "hr-audit", name: "HR Audit", category: "hrd", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u3-hr-accounting-and-audit"] },

  // ── HR Analytics ─────────────────────────────────────────────────────
  { slug: "hr-analytics", name: "HR Analytics", category: "hr-analytics", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u3-human-resource-information-system", "u2-new-trends-and-emerging-concepts-in-hrm"] },
  { slug: "hr-scorecard", name: "HR Scorecard", category: "hr-analytics", frequency: "low", readTimeMinutes: 10, topicSlugs: ["u3-hr-accounting-and-audit"] },

  // ── Current Trends ───────────────────────────────────────────────────
  { slug: "ihrm-cross-cultural-global-hr", name: "IHRM, Cross-Cultural Management & Global HR Trends", category: "current-trends", frequency: "medium", readTimeMinutes: 14, topicSlugs: ["u3-ihrm-organisational-context-and-functions", "u3-ihrm-and-sustainable-business", "u3-cross-cultural-studies-and-cultural-diversity"] },
  { slug: "ir-changing-scenario", name: "Industrial Relations in the Changing Scenario", category: "current-trends", frequency: "low", readTimeMinutes: 10, topicSlugs: ["u5-ir-in-changing-scenario"] },
  { slug: "green-hrm", name: "Green HRM", category: "current-trends", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u2-new-trends-and-emerging-concepts-in-hrm"] },
  { slug: "e-hrm", name: "e-HRM", category: "current-trends", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u3-human-resource-information-system"] },
  { slug: "gig-economy", name: "Gig Economy", category: "current-trends", frequency: "high", readTimeMinutes: 10, topicSlugs: ["u10-new-dynamics-of-labour-market-in-india"] },

  // ── Organisational Behaviour ─────────────────────────────────────────
  { slug: "organizational-culture", name: "Organizational Culture", category: "ob", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u4-organisational-change-and-development"] },
  { slug: "organizational-climate", name: "Organizational Climate", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-organisational-change-and-development"] },
  { slug: "organizational-development", name: "Organizational Development", category: "ob", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u4-organisational-change-and-development"] },
  { slug: "organizational-change", name: "Organizational Change", category: "ob", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u4-organisational-change-and-development"] },
  { slug: "conflict-management", name: "Conflict Management", category: "ob", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u5-conflict-and-cooperation"] },
  { slug: "stress-management", name: "Stress Management", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-stress"] },
  { slug: "emotional-intelligence", name: "Emotional Intelligence", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-personality"] },
  { slug: "learning-organization", name: "Learning Organization", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-organisational-change-and-development"] },
  { slug: "group-dynamics", name: "Group Dynamics", category: "ob", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u4-group-dynamics"] },
  { slug: "power-and-authority", name: "Power & Authority", category: "ob", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u4-power-and-authority"] },

  // ── Labour Welfare ───────────────────────────────────────────────────
  { slug: "labour-welfare-concept-theories", name: "Labour Welfare: Concept, Scope & Theories", category: "labour-welfare", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u9-concept-scope-types-of-labour-welfare", "u9-theories-and-principles"] },
  { slug: "labour-welfare-funds", name: "Labour Welfare Funds", category: "labour-welfare", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u9-concept-scope-types-of-labour-welfare"] },
  { slug: "social-security-schemes", name: "Social Security: Concept, Assistance & Assurance", category: "labour-welfare", frequency: "high", readTimeMinutes: 14, topicSlugs: ["u9-social-security-concept-and-scope", "u9-social-assistance-and-social-assurance"] },
  { slug: "ilo", name: "International Labour Organisation (ILO)", category: "labour-welfare", frequency: "high", readTimeMinutes: 12, topicSlugs: ["u7-international-labour-organisation"] },
  { slug: "industrial-health-safety-welfare", name: "Industrial Health, Safety & Occupational Diseases", category: "labour-welfare", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u9-industrial-health-and-hygiene", "u9-industrial-accidents-and-safety", "u9-occupational-diseases"] },
  { slug: "labour-market", name: "Labour Market", category: "labour-welfare", frequency: "medium", readTimeMinutes: 10, topicSlugs: ["u10-features-of-labour-market"] },

  // ── Training & Development ───────────────────────────────────────────
  { slug: "training-and-development", name: "Training & Development", category: "hrm", frequency: "medium", readTimeMinutes: 12, topicSlugs: ["u2-training-and-development"] },
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

// Question/answer pairs for the topic page's visible FAQ section and its
// FAQPage structured data. Every answer is derived from the curated data
// above (frequency rating, syllabus units, read-time estimate) — no
// fabricated statistics. The prerender script mirrors this same template
// (scripts/generate-og-previews.mjs) so crawler and visitor copy match.
export function getTopicFaqs(topic: HighScoringTopic): { question: string; answer: string }[] {
  const units = getUnitsForTopic(topic);
  const unitText = units.length
    ? units.map(u => `Unit ${unitRoman(u.number)} (${u.title})`).join(" and ")
    : "the UGC NET Paper II Labour Welfare syllabus";

  const importance =
    topic.frequency === "high"
      ? `Yes — ${topic.name} is one of the most frequently asked areas in UGC NET Paper II Labour Welfare (Subject Code 55). Questions from it recur across exam cycles, so treat it as a must-prepare topic.`
      : topic.frequency === "medium"
        ? `${topic.name} appears occasionally in UGC NET Paper II Labour Welfare (Subject Code 55). It's a solid-return topic: prepare it after the very-high-frequency areas are covered.`
        : `${topic.name} is asked relatively rarely in UGC NET Paper II Labour Welfare (Subject Code 55), but it belongs to the official syllabus — cover it for completeness once the higher-frequency topics are done.`;

  return [
    {
      question: `Is ${topic.name} important for UGC NET Paper II (Labour Welfare / HRM)?`,
      answer: importance,
    },
    {
      question: `Which unit of the UGC NET Labour Welfare syllabus covers ${topic.name}?`,
      answer: `${topic.name} falls under ${unitText} of the official UGC NET/JRF Paper II syllabus for Labour Welfare / Personnel Management / Industrial Relations / HRM (Subject Code 55).`,
    },
    {
      question: `How should I prepare ${topic.name} for UGC NET?`,
      answer: `Start with the unit-wise study notes for ${topic.name} (roughly ${topic.readTimeMinutes} minutes of focused reading), then attempt the matching topic-wise MCQ sets, and finish by checking how it has been asked in previous year question papers. All three are free on Karn HR Academy.`,
    },
  ];
}
