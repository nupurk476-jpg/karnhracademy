import { Link } from "react-router-dom";
import {
  MessageSquare, Mic, PenTool, Mail, Presentation, Handshake, Globe2, Radio, FileBarChart,
} from "lucide-react";

const bcTopics = [
  { label: "Introduction to Business Communication", slug: "introduction-to-bc", icon: MessageSquare, desc: "Meaning, nature, scope & importance of business communication" },
  { label: "Communication Process & Barriers", slug: "communication-process-barriers", icon: Radio, desc: "Elements of communication process & overcoming barriers" },
  { label: "Types of Communication", slug: "types-of-communication", icon: Mic, desc: "Verbal, non-verbal, written & visual communication channels" },
  { label: "Business Letters & Reports", slug: "business-letters-reports", icon: PenTool, desc: "Formal letter writing, report formats & documentation standards" },
  { label: "Email & Digital Communication", slug: "email-digital-communication", icon: Mail, desc: "Email etiquette, netiquette & professional digital correspondence" },
  { label: "Presentation Skills", slug: "presentation-skills", icon: Presentation, desc: "Planning, designing & delivering effective business presentations" },
  { label: "Negotiation & Persuasion", slug: "negotiation-persuasion", icon: Handshake, desc: "Win-win negotiation, persuasion techniques & conflict resolution" },
  { label: "Cross-cultural Communication", slug: "cross-cultural-communication", icon: Globe2, desc: "Cultural dimensions, global etiquette & international business norms" },
  { label: "Corporate Communication", slug: "corporate-communication", icon: FileBarChart, desc: "Internal, external & crisis communication strategies" },
];

const BusinessCommunicationSection = () => {
  return (
    <section className="border-t border-border bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Professional Skills
          </span>
          <h2
            className="mt-3 text-3xl font-bold text-foreground md:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Business Communication
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Master professional communication skills — essential for MBA, BBA & corporate careers.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bcTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/bc/${topic.slug}`}
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

export { bcTopics };
export default BusinessCommunicationSection;
