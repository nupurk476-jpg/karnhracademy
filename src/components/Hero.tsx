import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Users, BarChart3, Target, CheckCircle2 } from "lucide-react";

const stats = [
  { value: "500+",  label: "Study Notes" },
  { value: "50+",   label: "Video Lectures" },
  { value: "1000+", label: "Practice MCQs" },
  { value: "10+",   label: "Subjects" },
];

const audiences = [
  "MBA Students",
  "BBA Students",
  "HR Professionals",
  "UGC NET Aspirants",
  "Assistant Professors",
];

const subjectCards = [
  { label: "Human Resource Management", icon: BookOpen,  color: "#3B5BDB", light: "#EDF2FF" },
  { label: "Organisational Behaviour",   icon: Users,     color: "#7048E8", light: "#F3F0FF" },
  { label: "Strategic HRM",             icon: Target,    color: "#0CA678", light: "#EBFBEE" },
  { label: "HR Analytics",              icon: BarChart3, color: "#C79A4B", light: "#FFF9DB" },
];

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* ── Split background ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2 pointer-events-none">
        {/* Left: deep navy */}
        <div style={{ background: "hsl(var(--primary))" }} />
        {/* Right: very light warm white */}
        <div className="bg-slate-50" />
      </div>

      {/* Subtle dot grid on navy side */}
      <div
        className="absolute inset-0 lg:right-1/2 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Gold accent circle — decorative */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none opacity-10 lg:opacity-20"
        style={{
          background: "radial-gradient(circle, #c79a4b 0%, transparent 70%)",
          transform: "translate(-40%, -40%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 min-h-[90vh] lg:min-h-[82vh] items-center gap-0">

          {/* ── Left: Navy panel ──────────────────────────────────────────── */}
          <div className="flex flex-col justify-center py-20 lg:py-0 lg:pr-14">
            {/* Eyebrow */}
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px w-8" style={{ backgroundColor: "#c79a4b" }} />
              <span
                className="text-xs font-bold uppercase tracking-[0.25em]"
                style={{ color: "#c79a4b" }}
              >
                Academic Knowledge Portal
              </span>
            </div>

            {/* Headline */}
            <h1
              className="mb-6 leading-[1.05]"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              The Smartest Way to{" "}
              <span style={{ color: "#c79a4b" }}>Master HR</span>{" "}
              &{" "}
              <span style={{ color: "#c79a4b" }}>Management</span>
            </h1>

            {/* Subheadline */}
            <p
              className="mb-8 max-w-md leading-relaxed"
              style={{ color: "rgba(255,255,255,0.75)", fontSize: "1.0625rem" }}
            >
              Structured notes, expert video lectures, and topic-wise MCQs — all aligned
              with MBA, BBA & UGC NET syllabi. Built for serious learners.
            </p>

            {/* Audience pills */}
            <div className="mb-10 flex flex-wrap gap-2">
              {audiences.map(a => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.80)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <CheckCircle2 className="h-3 w-3" style={{ color: "#c79a4b" }} />
                  {a}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-12">
              <Link
                to="/notes"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
                style={{
                  backgroundColor: "#c79a4b",
                  color: "#16243f",
                  fontFamily: "'Sora', sans-serif",
                  boxShadow: "0 4px 20px rgba(199,154,75,0.35)",
                }}
              >
                Start Learning Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/quizzes"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5"
                style={{
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  color: "#ffffff",
                  background: "rgba(255,255,255,0.05)",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Practice MCQs
              </Link>
            </div>

            {/* Stats */}
            <div
              className="grid grid-cols-4 gap-3 rounded-2xl py-5 px-4"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {stats.map(s => (
                <div key={s.label} className="text-center">
                  <p
                    className="text-2xl font-extrabold leading-none"
                    style={{ color: "#c79a4b", fontFamily: "'Sora', sans-serif" }}
                  >
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs leading-snug" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Light panel with visual ────────────────────────────── */}
          <div className="hidden lg:flex flex-col justify-center pl-14 py-20">
            {/* Floating subject cards */}
            <div className="relative">
              {/* Heading above cards */}
              <div className="mb-6">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#c79a4b" }}
                >
                  Explore Subjects
                </p>
                <p
                  className="text-2xl font-bold text-slate-800"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  10 Disciplines.<br />One Platform.
                </p>
              </div>

              {/* 2×2 subject grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {subjectCards.map(({ label, icon: Icon, color, light }) => (
                  <div
                    key={label}
                    className="rounded-2xl p-5 border transition-transform hover:-translate-y-1 cursor-default"
                    style={{
                      background: light,
                      borderColor: `${color}22`,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: color }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p
                      className="text-sm font-bold leading-snug"
                      style={{ color: "#1e293b" }}
                    >
                      {label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Study Resources</p>
                  </div>
                ))}
              </div>

              {/* Trust card */}
              <div
                className="rounded-2xl p-5 border flex items-center gap-4"
                style={{
                  background: "#fff",
                  borderColor: "#e2e8f0",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white font-extrabold text-lg"
                  style={{ background: "#16243f", fontFamily: "'Sora', sans-serif" }}
                >
                  K
                </div>
                <div className="flex-1">
                  <p
                    className="text-sm font-bold text-slate-800"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Karn HR Academy
                  </p>
                  <p className="text-xs text-slate-500">Trusted by 5,000+ students & educators</p>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4" fill="#c79a4b" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>

              {/* "More subjects" link */}
              <div className="mt-4 text-center">
                <Link
                  to="/notes"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                  style={{ color: "#c79a4b" }}
                >
                  View all 10 subjects <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
