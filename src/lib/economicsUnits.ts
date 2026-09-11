export type EcoTopic = { label: string; slug: string };
export type EcoUnit = { number: number; title: string; topics: EcoTopic[] };

// MBA / PGDM Managerial Economics — 6 units, following the standard
// AICTE-approved PGDM core-course structure (IIMs, XLRI, MDI, IMT, SPJIMR).
export const MBA_ECO_UNITS: EcoUnit[] = [
  {
    number: 1,
    title: "Introduction to Managerial Economics",
    topics: [
      { label: "Nature, Scope & Significance of Managerial Economics", slug: "u1-nature-scope-significance" },
      { label: "Relationship with Economics, Statistics & Decision Sciences", slug: "u1-relationship-economics-statistics-decision-sciences" },
      { label: "Fundamental Concepts: Opportunity Cost, Incremental, Time Perspective, Discounting & Equi-marginal", slug: "u1-fundamental-economic-concepts" },
      { label: "Role of the Managerial Economist in Decision-Making", slug: "u1-role-of-managerial-economist" },
    ],
  },
  {
    number: 2,
    title: "Demand Analysis",
    topics: [
      { label: "Law of Demand & Determinants of Demand", slug: "u2-law-and-determinants-of-demand" },
      { label: "Elasticity of Demand: Price, Income, Cross & Promotional", slug: "u2-elasticity-of-demand" },
      { label: "Demand Forecasting: Qualitative & Quantitative Methods", slug: "u2-demand-forecasting" },
      { label: "Consumer Behaviour: Utility & Indifference Curve Analysis", slug: "u2-consumer-behaviour-utility-indifference" },
    ],
  },
  {
    number: 3,
    title: "Production & Cost Analysis",
    topics: [
      { label: "Production Function: Short-Run & Long-Run", slug: "u3-production-function" },
      { label: "Law of Variable Proportions & Returns to Scale", slug: "u3-variable-proportions-returns-to-scale" },
      { label: "Cost Concepts: Opportunity, Explicit & Implicit Cost", slug: "u3-cost-concepts" },
      { label: "Short-Run & Long-Run Cost Curves", slug: "u3-short-run-long-run-cost-curves" },
      { label: "Economies & Diseconomies of Scale", slug: "u3-economies-diseconomies-of-scale" },
      { label: "Break-Even Analysis (Cost-Volume-Profit)", slug: "u3-break-even-cvp-analysis" },
    ],
  },
  {
    number: 4,
    title: "Market Structure & Pricing",
    topics: [
      { label: "Perfect Competition", slug: "u4-perfect-competition" },
      { label: "Monopoly", slug: "u4-monopoly" },
      { label: "Monopolistic Competition", slug: "u4-monopolistic-competition" },
      { label: "Oligopoly", slug: "u4-oligopoly" },
      { label: "Price-Output Determination under Each Market Structure", slug: "u4-price-output-determination" },
      { label: "Pricing Strategies: Discrimination, Skimming, Penetration & Transfer Pricing", slug: "u4-pricing-strategies" },
      { label: "Game Theory Basics: Nash Equilibrium & Prisoner's Dilemma", slug: "u4-game-theory-basics" },
    ],
  },
  {
    number: 5,
    title: "Macroeconomic Environment for Business",
    topics: [
      { label: "National Income Concepts: GDP, GNP & NNP", slug: "u5-national-income-concepts" },
      { label: "Business Cycles", slug: "u5-business-cycles" },
      { label: "Inflation, Unemployment & Monetary/Fiscal Policy", slug: "u5-inflation-unemployment-monetary-fiscal-policy" },
      { label: "Balance of Payments & Exchange Rate Basics", slug: "u5-balance-of-payments-exchange-rates" },
      { label: "Impact of Macroeconomic Policy on Business Decisions", slug: "u5-macro-policy-impact-on-business" },
    ],
  },
  {
    number: 6,
    title: "Capital Budgeting & Investment Decisions",
    topics: [
      { label: "Cost of Capital", slug: "u6-cost-of-capital" },
      { label: "Investment Appraisal: NPV, IRR & Payback Period", slug: "u6-investment-appraisal-npv-irr-payback" },
      { label: "Risk & Uncertainty in Decision-Making", slug: "u6-risk-and-uncertainty" },
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

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export function unitRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
