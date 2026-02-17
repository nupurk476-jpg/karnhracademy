import { GraduationCap, BookOpen, Award, FlaskConical } from "lucide-react";

const audiences = [
  {
    icon: GraduationCap,
    title: "MBA Students",
    description: "Case studies, strategic HRM frameworks, and management theory for postgraduate excellence.",
  },
  {
    icon: BookOpen,
    title: "BBA Students",
    description: "Foundational HR concepts, organizational behavior notes, and exam preparation materials.",
  },
  {
    icon: Award,
    title: "UGC NET Aspirants",
    description: "Comprehensive study guides, previous year papers, and practice sets for HRM & Labour Welfare.",
  },
  {
    icon: FlaskConical,
    title: "Research Scholars",
    description: "Research methodologies, literature reviews, and publication guidance for HR academia.",
  },
];

const AudienceCards = () => {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-accent">
            Who We Serve
          </p>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Tailored for Every Learner
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((item) => (
            <div
              key={item.title}
              className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-accent/40 hover:shadow-md"
            >
              <div className="mb-4 inline-flex rounded-md bg-primary/5 p-3">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AudienceCards;
