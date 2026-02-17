const areas = [
  "Strategic Human Resource Management",
  "Organizational Behavior & Culture",
  "Employee Relations & Labour Law",
  "Talent Acquisition & Retention",
  "Performance Management Systems",
  "Training & Development",
  "Compensation & Benefits",
  "HR Analytics & Digital HR",
  "Leadership & Change Management",
];

const ResearchAreas = () => {
  return (
    <section id="research" className="bg-muted px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-accent">
              Research Focus
            </p>
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Areas of Academic Inquiry
            </h2>
            <p className="mb-6 max-w-lg text-muted-foreground leading-relaxed">
              Our research encompasses the full spectrum of Human Resource Management 
              and organizational sciences, contributing to both academic discourse 
              and practical management applications.
            </p>
            <div className="h-1 w-16 rounded bg-accent" />
          </div>

          <div className="grid gap-3">
            {areas.map((area, i) => (
              <div
                key={area}
                className="flex items-center gap-4 rounded-md border border-border bg-card px-5 py-3.5 transition-colors hover:border-accent/30"
              >
                <span className="text-xs font-bold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-foreground">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResearchAreas;
