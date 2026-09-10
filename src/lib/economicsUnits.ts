export type EcoTopic = { label: string; slug: string };
export type EcoUnit = { number: number; title: string; topics: EcoTopic[] };

// MBA Managerial Economics — 5 units (standard Indian university syllabus)
export const MBA_ECO_UNITS: EcoUnit[] = [
  {
    number: 1,
    title: "Introduction to Managerial Economics & Demand Analysis",
    topics: [
      { label: "Nature & Scope of Managerial Economics", slug: "u1-nature-scope-managerial-economics" },
      { label: "Basic Economic Concepts & Tools", slug: "u1-basic-economic-concepts-tools" },
      { label: "Demand: Concept, Determinants & Types", slug: "u1-demand-concept-determinants-types" },
      { label: "Law of Demand & Demand Curve", slug: "u1-law-of-demand-curve" },
      { label: "Elasticity of Demand", slug: "u1-elasticity-of-demand" },
      { label: "Demand Forecasting Techniques", slug: "u1-demand-forecasting-techniques" },
    ],
  },
  {
    number: 2,
    title: "Production & Cost Analysis",
    topics: [
      { label: "Production Function & Laws of Production", slug: "u2-production-function-laws" },
      { label: "Returns to Scale & Isoquants", slug: "u2-returns-to-scale-isoquants" },
      { label: "Cost Concepts & Classification", slug: "u2-cost-concepts-classification" },
      { label: "Short-Run & Long-Run Cost Curves", slug: "u2-short-run-long-run-cost-curves" },
      { label: "Economies & Diseconomies of Scale", slug: "u2-economies-diseconomies-of-scale" },
      { label: "Revenue Concepts & Break-Even Analysis", slug: "u2-revenue-break-even-analysis" },
    ],
  },
  {
    number: 3,
    title: "Market Structures & Pricing",
    topics: [
      { label: "Perfect Competition: Features & Equilibrium", slug: "u3-perfect-competition" },
      { label: "Monopoly: Price & Output Determination", slug: "u3-monopoly-pricing" },
      { label: "Monopolistic Competition", slug: "u3-monopolistic-competition" },
      { label: "Oligopoly: Features, Models & Kinked Demand", slug: "u3-oligopoly-models" },
      { label: "Pricing Strategies & Methods", slug: "u3-pricing-strategies-methods" },
      { label: "Price Discrimination & Transfer Pricing", slug: "u3-price-discrimination-transfer" },
    ],
  },
  {
    number: 4,
    title: "Macroeconomics & Business Environment",
    topics: [
      { label: "National Income: Concepts & Measurement", slug: "u4-national-income-concepts" },
      { label: "Business Cycles: Phases & Theories", slug: "u4-business-cycles" },
      { label: "Money, Banking & Monetary Policy", slug: "u4-money-banking-monetary-policy" },
      { label: "Fiscal Policy & Government Expenditure", slug: "u4-fiscal-policy" },
      { label: "Inflation: Types, Causes & Control", slug: "u4-inflation-types-causes-control" },
      { label: "Economic Environment & Business Decisions", slug: "u4-economic-environment-business" },
    ],
  },
  {
    number: 5,
    title: "Indian Economy & International Trade",
    topics: [
      { label: "Structure & Features of Indian Economy", slug: "u5-structure-indian-economy" },
      { label: "Economic Reforms: LPG & New Economic Policy", slug: "u5-economic-reforms-lpg" },
      { label: "International Trade: Theories & Policy", slug: "u5-international-trade-theories" },
      { label: "Balance of Payments & Exchange Rates", slug: "u5-bop-exchange-rates" },
      { label: "WTO, FDI & Globalisation", slug: "u5-wto-fdi-globalisation" },
      { label: "Recent Economic Trends in India", slug: "u5-recent-economic-trends-india" },
    ],
  },
];

// BBA Business Economics — 5 units
export const BBA_ECO_UNITS: EcoUnit[] = [
  {
    number: 1,
    title: "Introduction to Economics & Demand Analysis",
    topics: [
      { label: "Basic Concepts: Scarcity, Choice & Opportunity Cost", slug: "b1-basic-concepts-scarcity-choice" },
      { label: "Nature & Scope of Business Economics", slug: "b1-nature-scope-business-economics" },
      { label: "Demand: Law, Curve & Determinants", slug: "b1-demand-law-curve-determinants" },
      { label: "Elasticity of Demand", slug: "b1-elasticity-of-demand" },
      { label: "Consumer Behaviour: Utility Analysis", slug: "b1-consumer-behaviour-utility" },
      { label: "Demand Forecasting", slug: "b1-demand-forecasting" },
    ],
  },
  {
    number: 2,
    title: "Supply & Market Equilibrium",
    topics: [
      { label: "Law of Supply & Supply Curve", slug: "b2-law-of-supply" },
      { label: "Elasticity of Supply", slug: "b2-elasticity-of-supply" },
      { label: "Market Equilibrium: Demand-Supply Interaction", slug: "b2-market-equilibrium" },
      { label: "Price Mechanism & Market Changes", slug: "b2-price-mechanism-market-changes" },
      { label: "Price Ceiling & Price Floor", slug: "b2-price-ceiling-floor" },
    ],
  },
  {
    number: 3,
    title: "Production, Cost & Revenue",
    topics: [
      { label: "Production Function & Law of Variable Proportions", slug: "b3-production-function-variable-proportions" },
      { label: "Returns to Scale", slug: "b3-returns-to-scale" },
      { label: "Cost Concepts: Fixed, Variable, Average & Marginal", slug: "b3-cost-concepts-fixed-variable" },
      { label: "Short-Run & Long-Run Cost Curves", slug: "b3-short-run-long-run-costs" },
      { label: "Revenue: Total, Average & Marginal", slug: "b3-revenue-total-average-marginal" },
      { label: "Break-Even Analysis", slug: "b3-break-even-analysis" },
    ],
  },
  {
    number: 4,
    title: "Market Structures",
    topics: [
      { label: "Perfect Competition: Equilibrium & Efficiency", slug: "b4-perfect-competition" },
      { label: "Monopoly: Price & Output Decisions", slug: "b4-monopoly" },
      { label: "Monopolistic Competition & Product Differentiation", slug: "b4-monopolistic-competition" },
      { label: "Oligopoly: Interdependence & Game Theory Basics", slug: "b4-oligopoly" },
      { label: "Pricing Strategies for Business", slug: "b4-pricing-strategies" },
    ],
  },
  {
    number: 5,
    title: "National Income & Indian Economy",
    topics: [
      { label: "National Income: Concepts & Measurement", slug: "b5-national-income-concepts" },
      { label: "Business Cycles: Phases & Impact", slug: "b5-business-cycles" },
      { label: "Inflation, Deflation & Price Stability", slug: "b5-inflation-deflation" },
      { label: "Indian Economy: Structure & Key Sectors", slug: "b5-indian-economy-structure" },
      { label: "Economic Reforms & Globalisation", slug: "b5-economic-reforms-globalisation" },
      { label: "Government Policies: Fiscal & Monetary", slug: "b5-government-policies-fiscal-monetary" },
    ],
  },
];

export const MBA_ECO_TOPICS: EcoTopic[] = MBA_ECO_UNITS.flatMap(u => u.topics);
export const BBA_ECO_TOPICS: EcoTopic[] = BBA_ECO_UNITS.flatMap(u => u.topics);

export function getMBAEcoUnitForTopicSlug(slug: string | null | undefined): EcoUnit | undefined {
  if (!slug) return undefined;
  return MBA_ECO_UNITS.find(u => u.topics.some(t => t.slug === slug));
}

export function getBBAEcoUnitForTopicSlug(slug: string | null | undefined): EcoUnit | undefined {
  if (!slug) return undefined;
  return BBA_ECO_UNITS.find(u => u.topics.some(t => t.slug === slug));
}

export function getMBAEcoUnitByNumber(n: number): EcoUnit | undefined {
  return MBA_ECO_UNITS.find(u => u.number === n);
}

export function getBBAEcoUnitByNumber(n: number): EcoUnit | undefined {
  return BBA_ECO_UNITS.find(u => u.number === n);
}

const ROMAN = ["I", "II", "III", "IV", "V"];
export function unitRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
