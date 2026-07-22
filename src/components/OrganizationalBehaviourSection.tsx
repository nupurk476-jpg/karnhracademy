import { Link } from "react-router-dom";
import {
  Users, Brain, UserCircle, Eye, Flame, GraduationCap,
  Users2, Crown, Building2, Repeat, Activity,
} from "lucide-react";

const obTopics = [
  { label: "Foundations of OB", slug: "foundations-of-ob", icon: Building2, desc: "Nature, scope & importance of organisational behaviour" },
  { label: "Individual Behaviour", slug: "individual-behaviour", icon: UserCircle, desc: "Determinants of individual behaviour at work" },
  { label: "Personality", slug: "personality", icon: Brain, desc: "Big Five, MBTI & personality theories in organizations" },
  { label: "Perception", slug: "perception", icon: Eye, desc: "Perceptual process, attribution & errors in judgement" },
  { label: "Motivation", slug: "motivation", icon: Flame, desc: "Maslow, Herzberg, McGregor & contemporary theories" },
  { label: "Learning", slug: "learning", icon: GraduationCap, desc: "Classical, operant & social learning in workplaces" },
  { label: "Group Dynamics", slug: "group-dynamics", icon: Users2, desc: "Group formation, teams, norms & cohesiveness" },
  { label: "Leadership", slug: "leadership", icon: Crown, desc: "Trait, behavioural & contingency theories of leadership" },
  { label: "Organisational Culture", slug: "organizational-culture", icon: Users, desc: "Culture, climate, values & socialization" },
  { label: "Change Management", slug: "change-management", icon: Repeat, desc: "Lewin's model, resistance & organizational development" },
  { label: "Conflict & Stress", slug: "conflict-and-stress", icon: Activity, desc: "Sources, types & management of conflict and stress" },
];

const OrganizationalBehaviourSection = () => {
  return (
    <section className="border-t border-border bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Behavioural Management
          </span>
          <h2
            className="mt-3 text-3xl font-bold text-foreground md:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Organisational Behaviour
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Explore how individuals, groups and structures shape behaviour within organisations — core for MBA, BBA & UGC NET/JRF HR aspirants.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {obTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/ob/${topic.slug}`}
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

export { obTopics };
export default OrganizationalBehaviourSection;