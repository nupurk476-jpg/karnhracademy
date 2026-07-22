// UGC NET Paper II — Labour Welfare / Personnel Management / Industrial
// Relations / Labour & Social Welfare / HRM (subject code 55). Unit structure
// mirrors the official UGC NET Bureau syllabus so Notes, MCQs and Previous
// Year Question papers can all be organised and filtered strictly
// unit-by-unit.
//
// Each topic's slug is prefixed "u<unit>-" so a topic_slug alone (the same
// column notes/quizzes already use for every other discipline) is enough to
// recover which unit it belongs to — see getUnitForTopicSlug below. Adding a
// unit or subtopic later is just editing the array; nothing else references
// these slugs by number.

export type LWTopic = { label: string; slug: string };
export type LWUnit = { number: number; title: string; topics: LWTopic[] };

export const LW_UNITS: LWUnit[] = [
  {
    number: 1,
    title: "Principles and Practices of Management",
    topics: [
      { label: "Development of Management Thought", slug: "u1-development-of-management-thought" },
      { label: "Contributions of Taylor, Fayol, Mayo, Follett & Barnard", slug: "u1-contributions-taylor-fayol-mayo-follett-barnard" },
      { label: "Behavioural, Systems, Quantitative & Contingency Approaches", slug: "u1-behavioural-systems-quantitative-contingency-approaches" },
      { label: "Planning and Decision Making", slug: "u1-planning-and-decision-making" },
      { label: "Organising", slug: "u1-organising" },
      { label: "Staffing", slug: "u1-staffing" },
      { label: "Directing", slug: "u1-directing" },
      { label: "Controlling", slug: "u1-controlling" },
      { label: "Coordinating", slug: "u1-coordinating" },
    ],
  },
  {
    number: 2,
    title: "Human Resource Management",
    topics: [
      { label: "Conceptual Framework of HRM", slug: "u2-conceptual-framework-of-hrm" },
      { label: "Human Resource Planning", slug: "u2-human-resource-planning" },
      { label: "Job Analysis", slug: "u2-job-analysis" },
      { label: "Recruitment, Selection, Placement & Induction", slug: "u2-recruitment-selection-placement-induction" },
      { label: "Training and Development", slug: "u2-training-and-development" },
      { label: "Performance Management", slug: "u2-performance-management" },
      { label: "Job Evaluation", slug: "u2-job-evaluation" },
      { label: "Compensation Management", slug: "u2-compensation-management" },
      { label: "Employee Benefits and Incentives", slug: "u2-employee-benefits-and-incentives" },
      { label: "Managing Career", slug: "u2-managing-career" },
      { label: "New Trends & Emerging Concepts in HRM", slug: "u2-new-trends-and-emerging-concepts-in-hrm" },
    ],
  },
  {
    number: 3,
    title: "Human Resource Development (HRD) & IHRM",
    topics: [
      { label: "HRD: Concepts, Assumptions & Values", slug: "u3-hrd-concepts-assumptions-values" },
      { label: "HRD Mechanisms & Interventions", slug: "u3-hrd-mechanisms-and-interventions" },
      { label: "Action-Research Model", slug: "u3-action-research-model" },
      { label: "HRD Culture and Climate", slug: "u3-hrd-culture-and-climate" },
      { label: "HR Accounting and Audit", slug: "u3-hr-accounting-and-audit" },
      { label: "Consultant–Client Relationship", slug: "u3-consultant-client-relationship" },
      { label: "Knowledge Management", slug: "u3-knowledge-management" },
      { label: "Human Resource Information System", slug: "u3-human-resource-information-system" },
      { label: "IHRM: Organisational Context & Functions", slug: "u3-ihrm-organisational-context-and-functions" },
      { label: "IHRM and Sustainable Business", slug: "u3-ihrm-and-sustainable-business" },
      { label: "Cross-Cultural Studies & Cultural Diversity", slug: "u3-cross-cultural-studies-and-cultural-diversity" },
      { label: "Transnational Organisations & IHRM Models", slug: "u3-transnational-organisations-and-ihrm-models" },
    ],
  },
  {
    number: 4,
    title: "Organisational Behaviour",
    topics: [
      { label: "Concept, Scope & Nature of Human Behaviour", slug: "u4-concept-scope-nature-of-human-behaviour" },
      { label: "Personality", slug: "u4-personality" },
      { label: "Perception", slug: "u4-perception" },
      { label: "Learning", slug: "u4-learning" },
      { label: "Attitude", slug: "u4-attitude" },
      { label: "Motivation", slug: "u4-motivation" },
      { label: "Interpersonal Behaviour", slug: "u4-interpersonal-behaviour" },
      { label: "Group Dynamics", slug: "u4-group-dynamics" },
      { label: "Leadership", slug: "u4-leadership" },
      { label: "Communication", slug: "u4-communication" },
      { label: "Power and Authority", slug: "u4-power-and-authority" },
      { label: "Stress", slug: "u4-stress" },
      { label: "Organisational Change and Development", slug: "u4-organisational-change-and-development" },
    ],
  },
  {
    number: 5,
    title: "Industrial Relations & Trade Unions",
    topics: [
      { label: "IR: Concept, Scope, Evolution & Approaches", slug: "u5-ir-concept-scope-evolution-approaches" },
      { label: "Actors and Models of IR", slug: "u5-actors-and-models-of-ir" },
      { label: "Conflict and Cooperation", slug: "u5-conflict-and-cooperation" },
      { label: "Bipartism and Tripartism", slug: "u5-bipartism-and-tripartism" },
      { label: "Collective Bargaining", slug: "u5-collective-bargaining" },
      { label: "Workers' Participation in Management", slug: "u5-workers-participation-in-management" },
      { label: "Grievance Handling and Disciplinary Action", slug: "u5-grievance-handling-and-disciplinary-action" },
      { label: "Code of Conduct", slug: "u5-code-of-conduct" },
      { label: "IR in Changing Scenario", slug: "u5-ir-in-changing-scenario" },
      { label: "Employers' Organisations", slug: "u5-employers-organisations" },
      { label: "Trade Unions: Concepts & Evolution", slug: "u5-trade-unions-concepts-and-evolution" },
      { label: "Problems of Trade Unions in India & Recognition", slug: "u5-problems-and-recognition-of-trade-unions" },
      { label: "The Trade Unions Act, 1926", slug: "u5-trade-unions-act-1926" },
      { label: "Emerging Role of Trade Unions in India", slug: "u5-emerging-role-of-trade-unions-in-india" },
    ],
  },
  {
    number: 6,
    title: "Industrial Disputes",
    topics: [
      { label: "Factors, Forms & Trends of Industrial Disputes", slug: "u6-factors-forms-trends-of-industrial-disputes" },
      { label: "Prevention and Settlement of Disputes", slug: "u6-prevention-and-settlement-of-disputes" },
      { label: "Role of State and Central Labour Administration", slug: "u6-role-of-state-and-central-labour-administration" },
      { label: "Strikes and Lockouts", slug: "u6-strikes-and-lockouts" },
      { label: "The Industrial Employment (Standing Orders) Act, 1946", slug: "u6-industrial-employment-standing-orders-act-1946" },
      { label: "The Industrial Disputes Act, 1947", slug: "u6-industrial-disputes-act-1947" },
    ],
  },
  {
    number: 7,
    title: "Labour Legislation",
    topics: [
      { label: "Objectives, Principles, Classification & Evolution", slug: "u7-objectives-principles-classification-evolution" },
      { label: "International Labour Organisation", slug: "u7-international-labour-organisation" },
      { label: "Social Justice and Labour Legislation", slug: "u7-social-justice-and-labour-legislation" },
      { label: "Indian Constitution and Labour Laws", slug: "u7-indian-constitution-and-labour-laws" },
      { label: "The Factories Act, 1948", slug: "u7-factories-act-1948" },
      { label: "The Mines Act, 1952", slug: "u7-mines-act-1952" },
      { label: "The Inter-State Migrant Workmen Act, 1979", slug: "u7-inter-state-migrant-workmen-act-1979" },
      { label: "The Contract Labour (Regulation & Abolition) Act, 1970", slug: "u7-contract-labour-regulation-abolition-act-1970" },
      { label: "The Building & Other Construction Workers Act, 1996", slug: "u7-building-and-other-construction-workers-act-1996" },
      { label: "The Child Labour (Prohibition & Regulation) Act, 1986", slug: "u7-child-labour-prohibition-regulation-act-1986" },
    ],
  },
  {
    number: 8,
    title: "Wages",
    topics: [
      { label: "Concept, Types & Factors Influencing Wages", slug: "u8-concept-types-factors-influencing-wages" },
      { label: "Wage Theories and Wage Differentials", slug: "u8-wage-theories-and-wage-differentials" },
      { label: "The Minimum Wages Act, 1948", slug: "u8-minimum-wages-act-1948" },
      { label: "The Payment of Wages Act, 1936", slug: "u8-payment-of-wages-act-1936" },
      { label: "The Payment of Bonus Act, 1965", slug: "u8-payment-of-bonus-act-1965" },
      { label: "The Equal Remuneration Act, 1976", slug: "u8-equal-remuneration-act-1976" },
      { label: "The Payment of Gratuity Act, 1972", slug: "u8-payment-of-gratuity-act-1972" },
      { label: "The Employees' Provident Fund & Misc. Provisions Act, 1952", slug: "u8-employees-provident-fund-act-1952" },
    ],
  },
  {
    number: 9,
    title: "Labour Welfare & Social Security",
    topics: [
      { label: "Concept, Scope & Types of Labour Welfare", slug: "u9-concept-scope-types-of-labour-welfare" },
      { label: "Theories and Principles of Labour Welfare", slug: "u9-theories-and-principles" },
      { label: "Industrial Health and Hygiene", slug: "u9-industrial-health-and-hygiene" },
      { label: "Industrial Accidents and Safety", slug: "u9-industrial-accidents-and-safety" },
      { label: "Occupational Diseases", slug: "u9-occupational-diseases" },
      { label: "Social Security: Concept and Scope", slug: "u9-social-security-concept-and-scope" },
      { label: "Social Assistance and Social Assurance", slug: "u9-social-assistance-and-social-assurance" },
    ],
  },
  {
    number: 10,
    title: "Labour Market",
    topics: [
      { label: "Features of Labour Market", slug: "u10-features-of-labour-market" },
      { label: "Demand and Supply of Labour", slug: "u10-demand-and-supply-of-labour" },
      { label: "Nature and Composition of Indian Labour Force", slug: "u10-nature-and-composition-of-indian-labour-force" },
      { label: "Unemployment and Underemployment", slug: "u10-unemployment-and-underemployment" },
      { label: "Types of Labour Market", slug: "u10-types-of-labour-market" },
      { label: "Characteristics of Indian Labour Market", slug: "u10-characteristics-of-indian-labour-market" },
      { label: "New Dynamics of Labour Market in India", slug: "u10-new-dynamics-of-labour-market-in-india" },
      { label: "Economic Systems and Labour Market", slug: "u10-economic-systems-and-labour-market" },
      { label: "Problems of Labour in India", slug: "u10-problems-of-labour-in-india" },
    ],
  },
];

export const LW_TOPICS: LWTopic[] = LW_UNITS.flatMap(u => u.topics);

// Topic slugs from the pre-2026 unit structure that no longer exist above,
// mapped to their closest topic in the current syllabus. Notes/quizzes saved
// with an old slug keep filing under the right unit (the "u<n>-" prefix of an
// old slug may not match its new unit — e.g. old u8 acts now live in Units V,
// VI and VII). Re-saving such a row in the admin migrates it to the new slug.
export const LEGACY_LW_TOPIC_SLUGS: Record<string, string> = {
  "u1-schools-of-management-thought": "u1-development-of-management-thought",
  "u1-planning": "u1-planning-and-decision-making",
  "u1-communication": "u4-communication",
  "u2-personnel-department-and-structure": "u2-conceptual-framework-of-hrm",
  "u2-line-and-staff": "u2-conceptual-framework-of-hrm",
  "u2-manpower-planning": "u2-human-resource-planning",
  "u2-wage-and-salary-administration": "u2-compensation-management",
  "u2-wage-payment-methods": "u2-compensation-management",
  "u2-grievance-handling": "u5-grievance-handling-and-disciplinary-action",
  "u2-disciplinary-action": "u5-grievance-handling-and-disciplinary-action",
  "u3-importance-evolution-functions-of-hrd": "u3-hrd-concepts-assumptions-values",
  "u3-hrd-organisation": "u3-hrd-mechanisms-and-interventions",
  "u3-performance-appraisal": "u2-performance-management",
  "u3-training-and-development": "u2-training-and-development",
  "u3-quality-of-work-life": "u3-hrd-mechanisms-and-interventions",
  "u3-career-planning": "u2-managing-career",
  "u3-quality-circles": "u3-hrd-mechanisms-and-interventions",
  "u3-worker-training": "u2-training-and-development",
  "u3-management-development": "u2-training-and-development",
  "u3-evaluation-of-training": "u2-training-and-development",
  "u4-job-satisfaction": "u4-attitude",
  "u4-morale": "u4-attitude",
  "u4-fatigue-and-monotony": "u4-stress",
  "u4-organisational-effectiveness": "u4-organisational-change-and-development",
  "u5-industrial-disputes": "u6-factors-forms-trends-of-industrial-disputes",
  "u5-dispute-settlement-machinery": "u6-prevention-and-settlement-of-disputes",
  "u5-code-of-discipline": "u5-code-of-conduct",
  "u5-tripartite-bodies": "u5-bipartism-and-tripartism",
  "u5-ilo": "u7-international-labour-organisation",
  "u5-ir-under-new-economic-reforms": "u5-ir-in-changing-scenario",
  "u6-meaning-objectives-functions": "u5-trade-unions-concepts-and-evolution",
  "u6-theories-of-trade-unions": "u5-trade-unions-concepts-and-evolution",
  "u6-structure-of-trade-unions": "u5-trade-unions-concepts-and-evolution",
  "u6-trade-union-movement-in-india": "u5-trade-unions-concepts-and-evolution",
  "u6-leadership": "u5-problems-and-recognition-of-trade-unions",
  "u6-finance": "u5-problems-and-recognition-of-trade-unions",
  "u6-union-politics": "u5-problems-and-recognition-of-trade-unions",
  "u6-inter-union-rivalry": "u5-problems-and-recognition-of-trade-unions",
  "u7-objectives-principles-classification": "u7-objectives-principles-classification-evolution",
  "u7-evolution-of-labour-legislation-in-india": "u7-objectives-principles-classification-evolution",
  "u7-impact-of-ilo": "u7-international-labour-organisation",
  "u7-labour-legislation-and-indian-constitution": "u7-indian-constitution-and-labour-laws",
  "u7-esi-act-1948": "u9-social-security-concept-and-scope",
  "u7-workmens-compensation-act-1923": "u9-social-security-concept-and-scope",
  "u7-maternity-benefit-act-1961": "u9-social-security-concept-and-scope",
  "u8-trade-unions-act-1926": "u5-trade-unions-act-1926",
  "u8-industrial-employment-standing-orders-act-1946": "u6-industrial-employment-standing-orders-act-1946",
  "u8-industrial-disputes-act-1947": "u6-industrial-disputes-act-1947",
  "u8-child-labour-prohibition-regulation-act-1986": "u7-child-labour-prohibition-regulation-act-1986",
  "u9-meaning-definition-scope": "u9-concept-scope-types-of-labour-welfare",
  "u9-approaches-to-labour-welfare": "u9-theories-and-principles",
  "u9-statutory-and-non-statutory-welfare": "u9-concept-scope-types-of-labour-welfare",
  "u9-intra-mural-and-extra-mural-welfare": "u9-concept-scope-types-of-labour-welfare",
  "u9-agencies-of-labour-welfare": "u9-concept-scope-types-of-labour-welfare",
  "u10-composition-of-indian-labour-force": "u10-nature-and-composition-of-indian-labour-force",
  "u10-concepts-of-wages": "u8-concept-types-factors-influencing-wages",
  "u10-state-regulation-of-wages": "u8-concept-types-factors-influencing-wages",
  "u10-fixation-of-wages": "u8-concept-types-factors-influencing-wages",
  "u10-wage-theories": "u8-wage-theories-and-wage-differentials",
  "u10-wage-differentials": "u8-wage-theories-and-wage-differentials",
};

// Canonical form of a topic slug: legacy slugs resolve to their current
// equivalent, current (and non-LW) slugs pass through unchanged.
export function resolveLWTopicSlug(slug: string): string {
  return LEGACY_LW_TOPIC_SLUGS[slug] ?? slug;
}

export function getUnitForTopicSlug(slug: string | null | undefined): LWUnit | undefined {
  if (!slug) return undefined;
  const resolved = resolveLWTopicSlug(slug);
  return LW_UNITS.find(u => u.topics.some(t => t.slug === resolved));
}

export function getUnitByNumber(n: number): LWUnit | undefined {
  return LW_UNITS.find(u => u.number === n);
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export function unitRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
