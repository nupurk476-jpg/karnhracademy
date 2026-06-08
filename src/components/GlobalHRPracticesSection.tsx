import { Link } from "react-router-dom";
import { Globe, Plane, Languages, Briefcase, Scale, Users2, Building, HandCoins, Network } from "lucide-react";

const ghrTopics = [
  { label: "Introduction to Global HRM", slug: "introduction-to-ghrm", icon: Globe, desc: "Concept, scope & importance of international HRM" },
  { label: "International Staffing", slug: "international-staffing", icon: Users2, desc: "Ethnocentric, polycentric, geocentric & regiocentric approaches" },
  { label: "Expatriate Management", slug: "expatriate-management", icon: Plane, desc: "Selection, training, repatriation & failure factors" },
  { label: "Cross-Cultural Management", slug: "cross-cultural-management", icon: Languages, desc: "Hofstede, Trompenaars & cultural dimensions" },
  { label: "Global Compensation", slug: "global-compensation", icon: HandCoins, desc: "Balance sheet approach, allowances & benefits" },
  { label: "International Training & Development", slug: "international-training", icon: Briefcase, desc: "Cultural training, language & global competency building" },
  { label: "International Labour Standards", slug: "international-labour-standards", icon: Scale, desc: "ILO, conventions & global employment regulations" },
  { label: "MNCs & HR Practices", slug: "mncs-hr-practices", icon: Building, desc: "HR strategies in multinational corporations" },
  { label: "Global Workforce Diversity", slug: "global-workforce-diversity", icon: Network, desc: "Diversity, inclusion & managing global talent" },
];

const GlobalHRPracticesSection = () => {
  return (
    <section className="border-t border-border bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            International HRM
          </span>
          <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Global HR Practices
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Understand international HRM, cross-cultural management & global workforce strategies — vital for MBA, BBA & UGC NET aspirants.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ghrTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/ghr/${topic.slug}`}
              className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
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

export { ghrTopics };
export default GlobalHRPracticesSection;
