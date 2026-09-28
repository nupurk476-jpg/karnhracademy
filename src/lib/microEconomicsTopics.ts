import {
  BookOpen, TrendingDown, Percent, Heart, Activity, Factory,
  Calculator, Scale, Crown, Users, Coins, Layers,
} from "lucide-react";
import type { DisciplineTopic } from "@/components/DisciplineTopicPage";

// Micro Economics is topic-based (like HRM or OB), not unit-based like the
// MBA/BBA Economics tracks. Slugs carry a "micro-" prefix because topic
// slugs are looked up across every subject, and the Economics tracks
// already cover overlapping ground (demand, elasticity, cost, markets).
export const microTopics: DisciplineTopic[] = [
  { label: "Introduction to Micro Economics", slug: "micro-introduction", icon: BookOpen, desc: "Nature & scope, micro vs macro, scarcity, choice & opportunity cost" },
  { label: "Theory of Demand & Supply", slug: "micro-demand-and-supply", icon: TrendingDown, desc: "Law of demand, determinants, shifts & market equilibrium" },
  { label: "Elasticity of Demand & Supply", slug: "micro-elasticity", icon: Percent, desc: "Price, income & cross elasticity — measurement and uses" },
  { label: "Utility Analysis", slug: "micro-utility-analysis", icon: Heart, desc: "Cardinal utility, diminishing marginal utility, consumer surplus" },
  { label: "Indifference Curve Analysis", slug: "micro-indifference-curves", icon: Activity, desc: "Ordinal utility, budget line, consumer equilibrium, income & substitution effects" },
  { label: "Theory of Production", slug: "micro-theory-of-production", icon: Factory, desc: "Production function, law of variable proportions, returns to scale, isoquants" },
  { label: "Theory of Cost & Revenue", slug: "micro-cost-and-revenue", icon: Calculator, desc: "Short-run & long-run costs, TR/AR/MR, economies of scale" },
  { label: "Perfect Competition", slug: "micro-perfect-competition", icon: Scale, desc: "Features, price-output equilibrium of the firm & industry" },
  { label: "Monopoly & Price Discrimination", slug: "micro-monopoly", icon: Crown, desc: "Monopoly equilibrium, degrees of price discrimination" },
  { label: "Monopolistic Competition & Oligopoly", slug: "micro-imperfect-competition", icon: Users, desc: "Product differentiation, selling costs, kinked demand, cartels" },
  { label: "Theory of Factor Pricing", slug: "micro-factor-pricing", icon: Coins, desc: "Marginal productivity theory — rent, wages, interest & profit" },
  { label: "Welfare Economics", slug: "micro-welfare-economics", icon: Layers, desc: "Pareto optimality, market failure & externalities" },
];
