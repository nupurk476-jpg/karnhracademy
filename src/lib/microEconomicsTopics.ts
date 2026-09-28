import {
  BookOpen, Heart, Activity, Shuffle, Eye, TrendingDown, Percent, Gift,
  TrendingUp, Factory, Maximize2, Calculator, Building2, Wallet, Target,
  Scale, Store, Equal, Crown, Palette, Users,
  PieChart, MapPin, HandCoins, Banknote, BarChart3,
  Sparkles, ArrowLeftRight, Network, AlertTriangle,
} from "lucide-react";
import type { DisciplineTopic } from "@/components/DisciplineTopicPage";

// Micro Economics, grouped the way the paper is taught: consumer behaviour,
// producer behaviour, markets, distribution, welfare. Each topic still has
// its own page under /micro-economics/:slug.
//
// Slugs follow the unit-based convention ("u<unit>-…"): the course catalog
// reads the unit straight off the slug (see course_module_key), so a
// course groups lessons by unit rather than listing thirty topics. The
// "micro-" after it keeps them apart from the MBA/BBA Economics slugs,
// since topic slugs are resolved across every subject.
export type MicroUnit = { number: number; title: string; topics: DisciplineTopic[] };

export const MICRO_UNITS: MicroUnit[] = [
  {
    number: 1,
    title: "Consumer Behaviour",
    topics: [
      { label: "Introduction to Micro Economics", slug: "u1-micro-introduction", icon: BookOpen, desc: "Nature & scope, micro vs macro, scarcity, choice & opportunity cost" },
      { label: "Cardinal Utility Analysis", slug: "u1-micro-cardinal-utility", icon: Heart, desc: "Total & marginal utility, law of diminishing marginal utility, equi-marginal utility, consumer's equilibrium" },
      { label: "Ordinal Utility Analysis (Indifference Curves)", slug: "u1-micro-ordinal-utility", icon: Activity, desc: "Indifference curves & their properties, MRS, budget line, consumer's equilibrium" },
      { label: "Price, Income & Substitution Effects", slug: "u1-micro-price-income-substitution-effects", icon: Shuffle, desc: "ICC & PCC, Hicks & Slutsky decomposition, normal, inferior & Giffen goods" },
      { label: "Revealed Preference Theory", slug: "u1-micro-revealed-preference", icon: Eye, desc: "Samuelson's revealed preference and derivation of the demand curve" },
      { label: "Demand Analysis", slug: "u1-micro-demand-analysis", icon: TrendingDown, desc: "Law of demand, determinants, exceptions, movement vs shift of the demand curve" },
      { label: "Elasticity of Demand", slug: "u1-micro-elasticity-of-demand", icon: Percent, desc: "Price, income & cross elasticity — types, measurement methods and uses" },
      { label: "Consumer Surplus", slug: "u1-micro-consumer-surplus", icon: Gift, desc: "Marshall's and Hicks' measures of consumer surplus" },
    ],
  },
  {
    number: 2,
    title: "Producer Behaviour",
    topics: [
      { label: "Law of Supply & Elasticity of Supply", slug: "u2-micro-law-of-supply", icon: TrendingUp, desc: "Law of supply, determinants, shifts in supply, elasticity of supply" },
      { label: "Production Function & Law of Variable Proportions", slug: "u2-micro-production-function", icon: Factory, desc: "Short-run production, TP, AP & MP, three stages of production" },
      { label: "Returns to Scale & Isoquants", slug: "u2-micro-returns-to-scale", icon: Maximize2, desc: "Returns to scale, isoquants, iso-cost lines, producer's equilibrium" },
      { label: "Cost Concepts & Cost Curves", slug: "u2-micro-cost-curves", icon: Calculator, desc: "Short-run & long-run cost curves, U-shaped AC, LAC as the envelope curve" },
      { label: "Economies & Diseconomies of Scale", slug: "u2-micro-economies-of-scale", icon: Building2, desc: "Internal & external economies and diseconomies of scale" },
      { label: "Revenue Concepts & Curves", slug: "u2-micro-revenue-curves", icon: Wallet, desc: "TR, AR & MR, and their relation with elasticity of demand" },
      { label: "Equilibrium of the Firm", slug: "u2-micro-equilibrium-of-firm", icon: Target, desc: "Profit maximisation — TR-TC and MR-MC approaches" },
    ],
  },
  {
    number: 3,
    title: "Market Structure & Market Equilibrium",
    topics: [
      { label: "Market Equilibrium", slug: "u3-micro-market-equilibrium", icon: Scale, desc: "Price determination by demand & supply, shifts, stability (Walrasian & Marshallian), cobweb model" },
      { label: "Market Structures & Time Element", slug: "u3-micro-market-structures", icon: Store, desc: "Classification of markets, Marshall's time element in price determination" },
      { label: "Perfect Competition", slug: "u3-micro-perfect-competition", icon: Equal, desc: "Short-run & long-run equilibrium of the firm and industry" },
      { label: "Monopoly & Price Discrimination", slug: "u3-micro-monopoly", icon: Crown, desc: "Monopoly equilibrium, degrees of price discrimination, monopoly vs competition" },
      { label: "Monopolistic Competition", slug: "u3-micro-monopolistic-competition", icon: Palette, desc: "Chamberlin's model, product differentiation, selling costs, excess capacity" },
      { label: "Oligopoly & Duopoly", slug: "u3-micro-oligopoly", icon: Users, desc: "Kinked demand curve, Cournot, cartels, price leadership, basics of game theory" },
    ],
  },
  {
    number: 4,
    title: "Distribution Theories",
    topics: [
      { label: "Marginal Productivity Theory of Distribution", slug: "u4-micro-marginal-productivity", icon: PieChart, desc: "Marginal productivity theory and the modern theory of factor pricing" },
      { label: "Theories of Rent", slug: "u4-micro-theories-of-rent", icon: MapPin, desc: "Ricardian theory, modern theory of rent, quasi-rent" },
      { label: "Theories of Wages", slug: "u4-micro-theories-of-wages", icon: HandCoins, desc: "Subsistence, wage fund, marginal productivity & collective bargaining theories" },
      { label: "Theories of Interest", slug: "u4-micro-theories-of-interest", icon: Banknote, desc: "Classical, loanable funds and Keynes' liquidity preference theories" },
      { label: "Theories of Profit", slug: "u4-micro-theories-of-profit", icon: BarChart3, desc: "Dynamic, innovation, risk-bearing and uncertainty-bearing theories" },
    ],
  },
  {
    number: 5,
    title: "Welfare Economics",
    topics: [
      { label: "Pareto Optimality", slug: "u5-micro-pareto-optimality", icon: Sparkles, desc: "Pareto criterion and optimality conditions in exchange, production & product-mix" },
      { label: "Compensation Principle", slug: "u5-micro-compensation-principle", icon: ArrowLeftRight, desc: "Kaldor-Hicks and Scitovsky criteria" },
      { label: "Social Welfare Function", slug: "u5-micro-social-welfare-function", icon: Network, desc: "Bergson-Samuelson welfare function, Arrow's impossibility theorem" },
      { label: "Market Failure & Externalities", slug: "u5-micro-market-failure", icon: AlertTriangle, desc: "Externalities, public goods, Pigovian taxes & subsidies" },
    ],
  },
];

export const microTopics: DisciplineTopic[] = MICRO_UNITS.flatMap(u => u.topics);

// The label/slug shape the admin picker and course pages expect.
export const MICRO_ECO_UNITS = MICRO_UNITS.map(u => ({
  number: u.number,
  title: u.title,
  topics: u.topics.map(({ label, slug }) => ({ label, slug })),
}));
