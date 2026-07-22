import { Link } from "react-router-dom";
import { Repeat, Lightbulb, GitBranch, Workflow, RefreshCw, Compass, Users, TrendingUp, ShieldAlert } from "lucide-react";

const odcmTopics = [
  { label: "Introduction to OD", slug: "introduction-to-od", icon: Lightbulb, desc: "Concept, nature & scope of Organisational Development" },
  { label: "OD Interventions", slug: "od-interventions", icon: Workflow, desc: "Techniques & strategies used in OD processes" },
  { label: "Action Research Model", slug: "action-research-model", icon: Compass, desc: "Diagnosis, action planning & evaluation cycles" },
  { label: "Change Management Models", slug: "change-management-models", icon: GitBranch, desc: "Lewin, Kotter, ADKAR & McKinsey 7S frameworks" },
  { label: "Managing Resistance to Change", slug: "managing-resistance", icon: ShieldAlert, desc: "Sources of resistance & strategies to overcome them" },
  { label: "Planned vs Emergent Change", slug: "planned-vs-emergent", icon: Repeat, desc: "Comparing structured and adaptive change approaches" },
  { label: "Organisational Transformation", slug: "organizational-transformation", icon: RefreshCw, desc: "Large-scale change & business transformation" },
  { label: "Team & Group Interventions", slug: "team-group-interventions", icon: Users, desc: "Team building, T-groups & process consultation" },
  { label: "Future of OD & Change", slug: "future-of-od", icon: TrendingUp, desc: "Trends, digital change & agile transformation" },
];

const OrgDevChangeMgmtSection = () => {
  return (
    <section className="border-t border-border bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Transformation & Growth
          </span>
          <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Organisational Development & Change Management
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Explore frameworks, interventions & strategies driving organisational change — essential for MBA, BBA & UGC NET/JRF aspirants.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {odcmTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/odcm/${topic.slug}`}
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

export { odcmTopics };
export default OrgDevChangeMgmtSection;
