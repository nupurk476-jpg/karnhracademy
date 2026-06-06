import { Link } from "react-router-dom";
import {
  ClipboardList, Network, UserPlus, Compass, GaugeCircle,
  Workflow, Lightbulb, ShieldCheck, Scale,
} from "lucide-react";

const pomTopics = [
  { label: "Planning", slug: "planning", icon: ClipboardList, desc: "Setting objectives, forecasting & deciding actions in advance" },
  { label: "Organizing", slug: "organizing", icon: Network, desc: "Structuring roles, authority and resources to achieve goals" },
  { label: "Staffing", slug: "staffing", icon: UserPlus, desc: "Manpower planning, recruitment, training & development" },
  { label: "Directing", slug: "directing", icon: Compass, desc: "Leadership, motivation, communication & supervision" },
  { label: "Controlling", slug: "controlling", icon: GaugeCircle, desc: "Setting standards, measuring performance & corrective action" },
  { label: "Coordination", slug: "coordination", icon: Workflow, desc: "Synchronising group efforts — the essence of management" },
  { label: "Decision Making", slug: "decision-making", icon: Lightbulb, desc: "Rational choice, problem solving & managerial judgement" },
  { label: "Principles of Fayol & Taylor", slug: "fayol-taylor", icon: ShieldCheck, desc: "14 Principles, Scientific Management & classical thought" },
  { label: "Business Ethics", slug: "business-ethics", icon: Scale, desc: "Values, CSR, corporate governance & ethical leadership" },
];

const PrinciplesOfManagementSection = () => {
  return (
    <section className="border-t border-border bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Foundational Management
          </span>
          <h2
            className="mt-3 text-3xl font-bold text-foreground md:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Principles of Management
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Master the classical functions and principles of management — essential for MBA, BBA & UGC NET aspirants.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pomTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/pom/${topic.slug}`}
              className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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

export { pomTopics };
export default PrinciplesOfManagementSection;