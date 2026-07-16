// UGC NET Paper II — Labour Welfare / Personnel Management / Industrial
// Relations / Labour & Social Welfare / HRM (subject code 55). Unit structure
// mirrors the official syllabus so Notes, MCQs and Previous Year Question
// papers can all be organised and filtered strictly unit-by-unit.
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
    title: "Schools of Management Thought",
    topics: [
      { label: "Schools of Management Thought", slug: "u1-schools-of-management-thought" },
      { label: "Planning", slug: "u1-planning" },
      { label: "Organising", slug: "u1-organising" },
      { label: "Directing", slug: "u1-directing" },
      { label: "Controlling", slug: "u1-controlling" },
      { label: "Coordinating", slug: "u1-coordinating" },
      { label: "Communication", slug: "u1-communication" },
    ],
  },
  {
    number: 2,
    title: "Personnel Management",
    topics: [
      { label: "Personnel Department & Its Structure", slug: "u2-personnel-department-and-structure" },
      { label: "Line and Staff", slug: "u2-line-and-staff" },
      { label: "Job Analysis", slug: "u2-job-analysis" },
      { label: "Manpower Planning", slug: "u2-manpower-planning" },
      { label: "Recruitment, Selection, Placement & Induction", slug: "u2-recruitment-selection-placement-induction" },
      { label: "Wage and Salary Administration", slug: "u2-wage-and-salary-administration" },
      { label: "Job Evaluation", slug: "u2-job-evaluation" },
      { label: "Wage Payment Methods", slug: "u2-wage-payment-methods" },
      { label: "Grievance Handling", slug: "u2-grievance-handling" },
      { label: "Disciplinary Action", slug: "u2-disciplinary-action" },
    ],
  },
  {
    number: 3,
    title: "Human Resource Development",
    topics: [
      { label: "Importance, Evolution & Functions of HRD", slug: "u3-importance-evolution-functions-of-hrd" },
      { label: "HRD Organisation", slug: "u3-hrd-organisation" },
      { label: "Performance Appraisal", slug: "u3-performance-appraisal" },
      { label: "Training and Development", slug: "u3-training-and-development" },
      { label: "Quality of Work Life", slug: "u3-quality-of-work-life" },
      { label: "Career Planning", slug: "u3-career-planning" },
      { label: "Quality Circles", slug: "u3-quality-circles" },
      { label: "Worker Training", slug: "u3-worker-training" },
      { label: "Management Development", slug: "u3-management-development" },
      { label: "Evaluation of Training", slug: "u3-evaluation-of-training" },
    ],
  },
  {
    number: 4,
    title: "Organisational Behaviour",
    topics: [
      { label: "Group Dynamics", slug: "u4-group-dynamics" },
      { label: "Motivation", slug: "u4-motivation" },
      { label: "Leadership", slug: "u4-leadership" },
      { label: "Job Satisfaction", slug: "u4-job-satisfaction" },
      { label: "Morale", slug: "u4-morale" },
      { label: "Fatigue and Monotony", slug: "u4-fatigue-and-monotony" },
      { label: "Organisational Change and Development", slug: "u4-organisational-change-and-development" },
      { label: "Organisational Effectiveness", slug: "u4-organisational-effectiveness" },
    ],
  },
  {
    number: 5,
    title: "Industrial Relations",
    topics: [
      { label: "Industrial Disputes", slug: "u5-industrial-disputes" },
      { label: "Dispute Settlement Machinery", slug: "u5-dispute-settlement-machinery" },
      { label: "Workers' Participation in Management", slug: "u5-workers-participation-in-management" },
      { label: "Code of Discipline", slug: "u5-code-of-discipline" },
      { label: "Tripartite Bodies", slug: "u5-tripartite-bodies" },
      { label: "ILO", slug: "u5-ilo" },
      { label: "Industrial Relations Under New Economic Reforms", slug: "u5-ir-under-new-economic-reforms" },
    ],
  },
  {
    number: 6,
    title: "Trade Unions",
    topics: [
      { label: "Meaning, Objectives & Functions", slug: "u6-meaning-objectives-functions" },
      { label: "Theories of Trade Unions", slug: "u6-theories-of-trade-unions" },
      { label: "Structure of Trade Unions", slug: "u6-structure-of-trade-unions" },
      { label: "Trade Union Movement in India", slug: "u6-trade-union-movement-in-india" },
      { label: "Leadership", slug: "u6-leadership" },
      { label: "Finance", slug: "u6-finance" },
      { label: "Union Politics", slug: "u6-union-politics" },
      { label: "Inter-union Rivalry", slug: "u6-inter-union-rivalry" },
    ],
  },
  {
    number: 7,
    title: "Labour Legislation — I",
    topics: [
      { label: "Objectives, Principles & Classification", slug: "u7-objectives-principles-classification" },
      { label: "Evolution of Labour Legislation in India", slug: "u7-evolution-of-labour-legislation-in-india" },
      { label: "Impact of ILO", slug: "u7-impact-of-ilo" },
      { label: "Labour Legislation and the Indian Constitution", slug: "u7-labour-legislation-and-indian-constitution" },
      { label: "Factories Act, 1948", slug: "u7-factories-act-1948" },
      { label: "ESI Act, 1948", slug: "u7-esi-act-1948" },
      { label: "Workmen's Compensation Act, 1923", slug: "u7-workmens-compensation-act-1923" },
      { label: "Maternity Benefit Act, 1961", slug: "u7-maternity-benefit-act-1961" },
    ],
  },
  {
    number: 8,
    title: "Labour Legislation — II",
    topics: [
      { label: "Trade Unions Act, 1926", slug: "u8-trade-unions-act-1926" },
      { label: "Industrial Employment (Standing Orders) Act, 1946", slug: "u8-industrial-employment-standing-orders-act-1946" },
      { label: "Industrial Disputes Act, 1947", slug: "u8-industrial-disputes-act-1947" },
      { label: "Minimum Wages Act, 1948", slug: "u8-minimum-wages-act-1948" },
      { label: "Payment of Wages Act, 1936", slug: "u8-payment-of-wages-act-1936" },
      { label: "Equal Remuneration Act, 1976", slug: "u8-equal-remuneration-act-1976" },
      { label: "Payment of Bonus Act, 1965", slug: "u8-payment-of-bonus-act-1965" },
      { label: "Child Labour (Prohibition & Regulation) Act, 1986", slug: "u8-child-labour-prohibition-regulation-act-1986" },
    ],
  },
  {
    number: 9,
    title: "Labour Welfare",
    topics: [
      { label: "Meaning, Definition & Scope", slug: "u9-meaning-definition-scope" },
      { label: "Theories and Principles", slug: "u9-theories-and-principles" },
      { label: "Approaches to Labour Welfare", slug: "u9-approaches-to-labour-welfare" },
      { label: "Statutory and Non-statutory Welfare", slug: "u9-statutory-and-non-statutory-welfare" },
      { label: "Intra-mural and Extra-mural Welfare", slug: "u9-intra-mural-and-extra-mural-welfare" },
      { label: "Agencies of Labour Welfare (State, Employer, Trade Unions, Voluntary)", slug: "u9-agencies-of-labour-welfare" },
    ],
  },
  {
    number: 10,
    title: "Labour Market",
    topics: [
      { label: "Demand and Supply of Labour", slug: "u10-demand-and-supply-of-labour" },
      { label: "Composition of Indian Labour Force", slug: "u10-composition-of-indian-labour-force" },
      { label: "Unemployment and Underemployment", slug: "u10-unemployment-and-underemployment" },
      { label: "Concepts of Wages", slug: "u10-concepts-of-wages" },
      { label: "State Regulation of Wages", slug: "u10-state-regulation-of-wages" },
      { label: "Fixation of Wages", slug: "u10-fixation-of-wages" },
      { label: "Wage Theories", slug: "u10-wage-theories" },
      { label: "Wage Differentials", slug: "u10-wage-differentials" },
    ],
  },
];

export const LW_TOPICS: LWTopic[] = LW_UNITS.flatMap(u => u.topics);

export function getUnitForTopicSlug(slug: string | null | undefined): LWUnit | undefined {
  if (!slug) return undefined;
  return LW_UNITS.find(u => u.topics.some(t => t.slug === slug));
}

export function getUnitByNumber(n: number): LWUnit | undefined {
  return LW_UNITS.find(u => u.number === n);
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export function unitRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
