import { Link } from "react-router-dom";
import {
  Target, BarChart3, Crosshair, Landmark, ShieldCheck,
  FileSliders, TrendingUp, Globe, Layers,
} from "lucide-react";

const smTopics = [
  { label: "Nature & Scope of SM", slug: "nature-and-scope-of-sm", icon: Globe, desc: "Concept, characteristics & strategic management process" },
  { label: "Strategic Intent", slug: "strategic-intent", icon: Crosshair, desc: "Vision, mission, goals & objectives of an organization" },
  { label: "Environmental Scanning", slug: "environmental-scanning", icon: BarChart3, desc: "SWOT, PESTLE & industry analysis techniques" },
  { label: "Strategic Analysis", slug: "strategic-analysis", icon: FileSliders, desc: "Portfolio, value chain & competitive advantage analysis" },
  { label: "Strategy Formulation", slug: "strategy-formulation", icon: TrendingUp, desc: "Corporate, business & functional level strategies" },
  { label: "Strategy Implementation", slug: "strategy-implementation", icon: Layers, desc: "Resource allocation, change management & execution" },
  { label: "Strategy Evaluation & Control", slug: "strategy-evaluation", icon: ShieldCheck, desc: "Monitoring, benchmarking & corrective actions" },
  { label: "Corporate Governance", slug: "corporate-governance", icon: Landmark, desc: "Board structures, ethics & stakeholder management" },
  { label: "Competitive Strategies", slug: "competitive-strategies", icon: Target, desc: "Porter's generic strategies & strategic alliances" },
];

const StrategicManagementSection = () => {
  return (
    <section className="border-t border-border bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent-deep">
            Advanced Management
          </span>
          <h2
            className="mt-3 text-3xl font-bold text-foreground md:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Strategic Management
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Understand how organizations formulate, implement and evaluate strategies to achieve competitive advantage — essential for MBA, BBA & UGC NET/JRF aspirants.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {smTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/sm/${topic.slug}`}
              className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent-deep transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <topic.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-foreground">{topic.label}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{topic.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export { smTopics };
export default StrategicManagementSection;
