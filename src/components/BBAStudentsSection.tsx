import { BookOpen, FileText, HelpCircle, ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const bbaResources = [
  {
    icon: FileText,
    title: "BBA Notes",
    description: "Comprehensive study notes covering Organizational Behavior, HRM fundamentals, and Business Communication.",
    link: "/notes",
    label: "Browse Notes",
  },
  {
    icon: HelpCircle,
    title: "Practice Quizzes",
    description: "Test your understanding with topic-wise quizzes designed for BBA semester exams.",
    link: "/quizzes",
    label: "Take Quizzes",
  },
  {
    icon: BookOpen,
    title: "HR Topics",
    description: "Structured learning paths through core HRM subjects — from basics to advanced concepts.",
    link: "/notes",
    label: "Explore Topics",
  },
];

const BBAStudentsSection = () => {
  return (
    <section className="bg-muted px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent">
              <GraduationCap className="h-4 w-4" />
              For BBA Students
            </div>
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Build Your HR Foundation{" "}
              <span className="italic text-accent">the Smart Way</span>
            </h2>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              Whether you are in your first year or preparing for final semester exams,
              our curated resources help BBA students master Human Resource Management
              with clarity and confidence.
            </p>
            <Link
              to="/notes"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-110"
            >
              Start Learning
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4">
            {bbaResources.map((item) => (
              <Link
                key={item.title}
                to={item.link}
                className="group flex items-start gap-4 rounded-lg border border-border bg-card p-5 transition-all hover:border-accent/40 hover:shadow-md"
              >
                <div className="inline-flex shrink-0 rounded-md bg-primary/5 p-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-lg font-semibold text-foreground group-hover:text-accent">
                    {item.title}
                  </h3>
                  <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                    {item.label} <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BBAStudentsSection;
