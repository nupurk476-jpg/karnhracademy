import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  BookOpen, Users, BarChart3, Target, TrendingUp, GraduationCap,
  DollarSign, Scale, Video, HelpCircle, Download, ArrowRight,
  FileText, ChevronRight, CheckCircle2, Mail, Star,
  Repeat, Globe, Briefcase, MessageSquare,
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────
const subjects = [
  { icon: BookOpen,       title: "Human Resource Management",        short: "HRM",        color: "#3B5BDB", light: "#EDF2FF", to: "/notes" },
  { icon: Users,          title: "Organisational Behaviour",          short: "OB",         color: "#7048E8", light: "#F3F0FF", to: "/notes" },
  { icon: Target,         title: "Strategic Management",              short: "SM",         color: "#0CA678", light: "#EBFBEE", to: "/notes" },
  { icon: Briefcase,      title: "Principles of Management",          short: "POM",        color: "#E67E22", light: "#FEF9EC", to: "/notes" },
  { icon: MessageSquare,  title: "Business Communication",            short: "BC",         color: "#0891B2", light: "#ECFEFF", to: "/notes" },
  { icon: Scale,          title: "Corporate Governance & Ethics",     short: "CG & BE",    color: "#E53E3E", light: "#FFF5F5", to: "/notes" },
  { icon: Repeat,         title: "OD & Change Management",           short: "OD & CM",    color: "#DD6B20", light: "#FFFAF0", to: "/notes" },
  { icon: Globe,          title: "Global HR Practices",              short: "Global HR",  color: "#319795", light: "#E6FFFA", to: "/notes" },
];

const features = [
  {
    icon: FileText,
    title: "Structured Notes",
    description: "Organised by subject, topic, and difficulty — perfectly aligned with MBA and UGC NET syllabi.",
    color: "#3B5BDB",
    light: "#EDF2FF",
  },
  {
    icon: Video,
    title: "Video Lectures",
    description: "Concept-clarity videos by subject experts — watch, pause, and revisit at your pace.",
    color: "#7048E8",
    light: "#F3F0FF",
  },
  {
    icon: HelpCircle,
    title: "Practice MCQs",
    description: "Topic-wise MCQs with instant feedback and detailed explanations for every question.",
    color: "#0CA678",
    light: "#EBFBEE",
  },
  {
    icon: Download,
    title: "Free Downloads",
    description: "PDFs, PPTs, and handouts freely available — no sign-up barriers for core content.",
    color: "#C79A4B",
    light: "#FFF9DB",
  },
  {
    icon: BookOpen,
    title: "Academic Quality",
    description: "Every resource is research-backed, peer-reviewed, and aligned to current syllabi.",
    color: "#E53E3E",
    light: "#FFF5F5",
  },
  {
    icon: Star,
    title: "Exam Ready",
    description: "Content mapped to MBA entrance, UGC NET, SET, and university examinations.",
    color: "#0891B2",
    light: "#ECFEFF",
  },
];

const topics = [
  "Recruitment & Selection", "Performance Appraisal", "Motivation Theories",
  "Leadership Styles", "Job Analysis", "HR Planning", "HR Analytics",
  "Compensation Management", "Training & Development", "OD & Change",
  "Talent Management", "Industrial Relations", "Business Ethics",
  "Strategic Planning", "Organisational Culture", "Employee Relations",
];

const testimonials = [
  { name: "Priya Sharma",   role: "MBA HR Student, Delhi University",  text: "The notes are incredibly well-structured. Helped me crack my semester exams with ease.", stars: 5 },
  { name: "Rahul Mehta",    role: "UGC NET Aspirant",                  text: "Topic-wise MCQs with explanations are gold. No other platform gives this quality for free.", stars: 5 },
  { name: "Dr. Anita Joshi", role: "Assistant Professor, HRM",         text: "I recommend Karn HR Academy to all my students. The academic quality is truly impressive.", stars: 5 },
];

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="h-px w-6 rounded-full" style={{ background: "#c79a4b" }} />
    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c79a4b" }}>{text}</span>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Karn HR Academy — Academic Resource Hub for HR & Management"
        description="Structured notes, video lectures, practice MCQs, and research resources for MBA, BBA & UGC NET aspirants in HR & Management."
        path="/"
      />
      <Header />
      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <Hero />

        {/* ── Subjects ──────────────────────────────────────────────────── */}
        <section id="subjects" className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
              <div>
                <SectionLabel text="Browse by Discipline" />
                <h2
                  className="text-3xl font-extrabold text-slate-900"
                  style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
                >
                  All Major HR & Management Subjects
                </h2>
                <p className="mt-2 text-slate-500 max-w-lg">
                  Comprehensive study materials for every subject in the MBA/BBA HR curriculum.
                </p>
              </div>
              <Link
                to="/notes"
                className="inline-flex items-center gap-1.5 text-sm font-semibold flex-shrink-0 hover:underline"
                style={{ color: "#c79a4b" }}
              >
                View all notes <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {subjects.map(s => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.title}
                    to={s.to}
                    className="group rounded-2xl border p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
                    style={{ background: s.light, borderColor: `${s.color}20` }}
                  >
                    <div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: s.color }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p
                      className="text-xs font-bold uppercase tracking-wider mb-1"
                      style={{ color: s.color }}
                    >
                      {s.short}
                    </p>
                    <p className="text-sm font-bold leading-snug text-slate-800 group-hover:text-slate-900">
                      {s.title}
                    </p>
                    <div
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: s.color }}
                    >
                      Explore <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Why Choose (Features) ──────────────────────────────────────── */}
        <section className="py-20" style={{ background: "#16243f" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-px w-6 rounded-full" style={{ background: "#c79a4b" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c79a4b" }}>
                  Why Choose Us
                </span>
                <div className="h-px w-6 rounded-full" style={{ background: "#c79a4b" }} />
              </div>
              <h2
                className="text-3xl font-extrabold text-white mb-3"
                style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
              >
                Everything You Need to Excel
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Built by educators, for serious learners. All resources are structured, syllabi-aligned, and completely free.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map(f => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="rounded-2xl p-6 border"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: f.light }}
                    >
                      <Icon className="h-6 w-6" style={{ color: f.color }} />
                    </div>
                    <h3
                      className="text-base font-bold text-white mb-2"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-400">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Popular Topics ─────────────────────────────────────────────── */}
        <section className="py-20 bg-slate-50 border-y border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                <SectionLabel text="Quick Access" />
                <h2
                  className="text-3xl font-extrabold text-slate-900"
                  style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
                >
                  Popular Topics
                </h2>
                <p className="mt-2 text-slate-500">Jump directly to the topics students search most.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {topics.map(t => (
                <Link
                  key={t}
                  to="/notes"
                  className="rounded-full border px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-[#c79a4b] hover:text-[#c79a4b] hover:bg-white"
                  style={{ borderColor: "#e2e8f0", background: "#fff" }}
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ───────────────────────────────────────────────── */}
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <SectionLabel text="Student Reviews" />
              <h2
                className="text-3xl font-extrabold text-slate-900"
                style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
              >
                Loved by Students & Educators
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map(t => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#c79a4b] text-[#c79a4b]" />
                    ))}
                  </div>
                  <p className="text-slate-700 leading-relaxed text-sm mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold text-sm flex-shrink-0"
                      style={{ background: "#16243f" }}
                    >
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quick Links Strip ──────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: FileText, label: "Study Notes",    sub: "500+ resources",     to: "/notes",    color: "#3B5BDB" },
                { icon: Video,    label: "Video Lectures", sub: "50+ lectures",        to: "/lectures", color: "#7048E8" },
                { icon: HelpCircle, label: "MCQ Quizzes", sub: "1000+ questions",     to: "/quizzes",  color: "#0CA678" },
                { icon: BookOpen, label: "Blog Articles",  sub: "In-depth insights",   to: "/blogs",    color: "#C79A4B" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all"
                  >
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:-translate-y-0.5"
                      style={{ background: item.color + "15" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.sub}</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Newsletter ─────────────────────────────────────────────────── */}
        <section className="py-20" style={{ background: "linear-gradient(135deg, #16243f 0%, #1e3a5f 100%)" }}>
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Mail className="h-5 w-5" style={{ color: "#c79a4b" }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c79a4b" }}>
                Stay Updated
              </span>
            </div>
            <h2
              className="text-3xl font-extrabold text-white mb-4"
              style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
            >
              Get New Resources in Your Inbox
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              New notes, quizzes, and articles every week — curated for MBA, BBA, and UGC NET preparation.
            </p>
            <NewsletterForm />
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
              {["No spam, ever", "Free forever", "Unsubscribe anytime"].map(t => (
                <span key={t} className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {t}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

// Inline newsletter form to avoid dep on old NewsletterSignup
const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setDone(true);
    setEmail("");
  };

  if (done) return (
    <p className="inline-flex items-center gap-2 text-emerald-400 font-semibold">
      <CheckCircle2 className="h-5 w-5" /> You're subscribed!
    </p>
  );

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="flex-1 rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c79a4b]/40"
        style={{ background: "rgba(255,255,255,0.07)" }}
      />
      <button
        type="submit"
        className="rounded-lg px-6 py-3 text-sm font-bold transition-all hover:opacity-90"
        style={{ background: "#c79a4b", color: "#16243f" }}
      >
        Subscribe
      </button>
    </form>
  );
};

export default Index;
