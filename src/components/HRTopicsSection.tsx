import { Link } from "react-router-dom";
import { 
  DollarSign, Target, Users, Settings, Handshake, 
  Monitor, TrendingUp, BarChart3, CalendarClock, History 
} from "lucide-react";

const hrTopics = [
  { label: "Compensation & Benefits", slug: "compensation-and-benefits", icon: DollarSign, desc: "Pay structures, incentives, employee benefits & total rewards strategy" },
  { label: "Performance Management", slug: "performance-management", icon: Target, desc: "Appraisals, KPIs, feedback systems & continuous performance improvement" },
  { label: "Recruitment & Selection", slug: "recruitment-and-selection", icon: Users, desc: "Talent acquisition, screening, interviewing & onboarding processes" },
  { label: "Functions of HR", slug: "functions-of-hr", icon: Settings, desc: "Core HR functions including staffing, training, development & compliance" },
  { label: "Industrial Relations", slug: "industrial-relations", icon: Handshake, desc: "Labour laws, trade unions, collective bargaining & dispute resolution" },
  { label: "HRIS & SHRM", slug: "hris-and-shrm", icon: Monitor, desc: "HR Information Systems, strategic HRM frameworks & digital transformation" },
  { label: "HR Analytics", slug: "hr-analytics", icon: BarChart3, desc: "Data-driven HR, workforce metrics, predictive analytics & dashboards" },
  { label: "HR Planning", slug: "human-resource-planning", icon: CalendarClock, desc: "Workforce planning, demand forecasting, succession planning & talent pipelines" },
  { label: "Evolution of HRM", slug: "evolution-of-hrm", icon: History, desc: "From personnel management to strategic HRM — historical development & milestones" },
];

const HRTopicsSection = () => {
  return (
    <section className="border-t border-border bg-card py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Explore HR Domains
          </span>
          <h2
            className="mt-3 text-3xl font-bold text-foreground md:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Human Resource Management
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Dive into the key areas of HR — from foundational concepts to modern analytics and strategic frameworks.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hrTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/hr/${topic.slug}`}
              className="group flex flex-col rounded-lg border border-border bg-background p-6 transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/5"
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

export { hrTopics };
export default HRTopicsSection;
