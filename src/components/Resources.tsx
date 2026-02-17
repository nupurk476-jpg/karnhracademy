import { FileText, Video, ClipboardList, BookMarked } from "lucide-react";

const resources = [
  {
    icon: FileText,
    title: "Study Notes & Guides",
    description: "Well-structured notes covering HRM syllabi for MBA, BBA, and UGC NET examinations.",
    tag: "Notes",
  },
  {
    icon: ClipboardList,
    title: "Previous Year Papers",
    description: "Curated collection of past examination papers with answer keys and explanations.",
    tag: "Exams",
  },
  {
    icon: BookMarked,
    title: "Research Papers",
    description: "Published papers and working manuscripts on contemporary HR management topics.",
    tag: "Research",
  },
  {
    icon: Video,
    title: "Lecture Materials",
    description: "Presentation slides, case studies, and supplementary teaching materials.",
    tag: "Teaching",
  },
];

const Resources = () => {
  return (
    <section id="resources" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-accent">
            Academic Resources
          </p>
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            Explore Our Collection
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Carefully curated academic resources designed to support your learning 
            and research journey in Human Resource Management.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {resources.map((item) => (
            <div
              key={item.title}
              className="group flex gap-5 rounded-lg border border-border bg-card p-6 transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <div className="shrink-0 rounded-md bg-primary/5 p-3 self-start">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {item.title}
                  </h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.tag}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Resources;
