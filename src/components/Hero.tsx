import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";

const stats = [
  { value: "500+", label: "Notes" },
  { value: "50+", label: "Video Lectures" },
  { value: "1000+", label: "MCQs" },
  { value: "10+", label: "Subjects" },
];

const decorativeSubjects = [
  { label: "Human Resource Management", color: "bg-blue-50 border-blue-100 text-blue-700" },
  { label: "Organisational Behaviour", color: "bg-violet-50 border-violet-100 text-violet-700" },
  { label: "Strategic HRM", color: "bg-amber-50 border-amber-100 text-amber-700" },
  { label: "HR Analytics", color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
];

const Hero = () => {
  return (
    <section className="bg-slate-50 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-6 h-0.5 rounded-full"
                style={{ backgroundColor: "hsl(var(--accent))" }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--accent))" }}
              >
                Academic Resource Hub
              </span>
            </div>

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight"
              style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.02em" }}
            >
              Your Academic Resource Hub for{" "}
              <span style={{ color: "hsl(var(--accent))" }}>HR & Management</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
              Structured notes, video lectures, practice MCQs, and research resources for
              MBA, BBA & UGC NET aspirants.
            </p>

            <div className="flex flex-wrap gap-3 mt-1">
              <Link
                to="/notes"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5"
                style={{
                  backgroundColor: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Explore Notes <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/#subjects"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-border bg-white text-foreground transition-all duration-150 hover:border-foreground/30 hover:-translate-y-0.5"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                Browse Subjects
              </Link>
            </div>

            {/* Search bar */}
            <div className="relative mt-2 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notes, topics, subjects…"
                readOnly
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-white text-sm shadow-sm focus:outline-none placeholder:text-muted-foreground/60 cursor-default"
              />
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-1.5">
                  <span
                    className="text-xl font-bold"
                    style={{ fontFamily: "Sora, sans-serif", color: "hsl(var(--accent))" }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right decorative panel */}
          <div className="hidden lg:flex flex-col gap-3 relative">
            <div
              className="absolute -top-6 -right-6 w-48 h-48 rounded-full opacity-20 pointer-events-none"
              style={{
                background: "radial-gradient(circle, hsl(var(--accent)), transparent)",
              }}
            />
            <div className="grid grid-cols-2 gap-3 relative z-10">
              {decorativeSubjects.map((subj) => (
                <div
                  key={subj.label}
                  className={`${subj.color} border rounded-xl p-4 flex flex-col gap-2`}
                >
                  <div
                    className="w-6 h-1 rounded-full opacity-40"
                    style={{ backgroundColor: "currentColor" }}
                  />
                  <span className="text-sm font-semibold leading-snug">{subj.label}</span>
                  <span className="text-xs opacity-60 font-medium">Study Resources</span>
                </div>
              ))}
            </div>
            <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3 relative z-10">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                style={{ backgroundColor: "hsl(var(--accent))" }}
              >
                K
              </div>
              <div className="flex flex-col">
                <span
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: "Sora, sans-serif" }}
                >
                  Karn HR Academy
                </span>
                <span className="text-xs text-muted-foreground">Trusted by 5,000+ students</span>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5" fill="hsl(var(--accent))" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
