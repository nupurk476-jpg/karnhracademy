import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Download, BookOpen, Languages, Briefcase,
  Users, Target, MessageSquare, Scale, Repeat, Globe, ChevronRight
} from "lucide-react";

// ── Discipline definitions ────────────────────────────────────────────────────
const disciplines = [
  {
    value: "hrm",
    label: "Human Resource Management",
    short: "HRM",
    icon: BookOpen,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    activeColor: "bg-blue-700 border-blue-700 text-white",
    iconColor: "text-blue-500",
    description: "Recruitment, compensation, SHRM, HR analytics, labour law",
  },
  {
    value: "ob",
    label: "Organizational Behaviour",
    short: "OB",
    icon: Users,
    color: "bg-violet-50 border-violet-200 text-violet-700",
    activeColor: "bg-violet-700 border-violet-700 text-white",
    iconColor: "text-violet-500",
    description: "Individual behaviour, motivation, leadership, group dynamics",
  },
  {
    value: "sm",
    label: "Strategic Management",
    short: "SM",
    icon: Target,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    activeColor: "bg-emerald-700 border-emerald-700 text-white",
    iconColor: "text-emerald-500",
    description: "SWOT, Porter's five forces, strategy formulation & evaluation",
  },
  {
    value: "pom",
    label: "Principles of Management",
    short: "POM",
    icon: Briefcase,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    activeColor: "bg-amber-700 border-amber-700 text-white",
    iconColor: "text-amber-500",
    description: "Planning, organising, directing, controlling, Fayol & Taylor",
  },
  {
    value: "bc",
    label: "Business Communication",
    short: "BC",
    icon: MessageSquare,
    color: "bg-cyan-50 border-cyan-200 text-cyan-700",
    activeColor: "bg-cyan-700 border-cyan-700 text-white",
    iconColor: "text-cyan-500",
    description: "Written, verbal, cross-cultural & digital business communication",
  },
  {
    value: "cgbe",
    label: "Corporate Governance & Business Ethics",
    short: "CG & BE",
    icon: Scale,
    color: "bg-rose-50 border-rose-200 text-rose-700",
    activeColor: "bg-rose-700 border-rose-700 text-white",
    iconColor: "text-rose-500",
    description: "Board governance, CSR, ESG, ethical decision-making",
  },
  {
    value: "odcm",
    label: "OD & Change Management",
    short: "OD & CM",
    icon: Repeat,
    color: "bg-orange-50 border-orange-200 text-orange-700",
    activeColor: "bg-orange-700 border-orange-700 text-white",
    iconColor: "text-orange-500",
    description: "OD interventions, change models, managing resistance",
  },
  {
    value: "ghr",
    label: "Global HR Practices",
    short: "Global HR",
    icon: Globe,
    color: "bg-teal-50 border-teal-200 text-teal-700",
    activeColor: "bg-teal-700 border-teal-700 text-white",
    iconColor: "text-teal-500",
    description: "Expatriate management, international staffing, MNCs & diversity",
  },
  {
    value: "english",
    label: "English for Management",
    short: "English",
    icon: Languages,
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    activeColor: "bg-indigo-700 border-indigo-700 text-white",
    iconColor: "text-indigo-500",
    description: "Vocabulary, grammar, reading comprehension, writing skills",
  },
];

const englishSubcategories = [
  { label: "All", value: "all" },
  { label: "Vocabulary", value: "vocabulary" },
  { label: "Grammar", value: "grammar" },
  { label: "Reading Comprehension", value: "reading-comprehension" },
  { label: "Writing Skills", value: "writing-skills" },
  { label: "Verbal Ability", value: "verbal-ability" },
  { label: "Synonyms & Antonyms", value: "synonyms-antonyms" },
  { label: "Idioms & Phrases", value: "idioms-phrases" },
];

// ─────────────────────────────────────────────────────────────────────────────

const NotesPage = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [emailModal, setEmailModal] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [englishSub, setEnglishSub] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setNotes(data));
  }, []);

  // Count notes per discipline
  const countFor = (value: string) =>
    notes.filter(n => value === "hrm" ? (!n.subject || n.subject === "hrm") : n.subject === value).length;

  // Filter notes for the selected discipline
  const filtered = notes.filter(n => {
    if (!activeSubject) return false;
    const matchesSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeSubject === "english") {
      if (n.subject !== "english") return false;
      if (englishSub !== "all" && n.topic_slug !== englishSub) return false;
      return true;
    }
    if (activeSubject === "hrm") return !n.subject || n.subject === "hrm";
    return n.subject === activeSubject;
  });

  const activeDiscipline = disciplines.find(d => d.value === activeSubject);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !emailModal) return;
    setSubmitting(true);
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setSubmitting(false);
    setEmailModal(null);
    setEmail("");
    const note = notes.find(n => n.id === emailModal);
    if (note?.file_url) {
      window.open(note.file_url, "_blank");
    } else {
      toast({ title: "Download unavailable", description: "No file attached to this note." });
    }
  };

  const NoteCard = ({ note }: { note: any }) => (
    <div className="flex flex-col rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
      {note.video_url ? (
        <video src={note.video_url} controls className="mb-3 w-full rounded-md bg-black aspect-video" />
      ) : (
        <FileText className="mb-3 h-10 w-10 text-accent" />
      )}
      <h3 className="mb-2 text-lg font-semibold text-foreground">{note.title}</h3>
      <p className="mb-4 flex-1 text-sm text-muted-foreground">{note.description}</p>
      {note.file_url && (
        <button
          onClick={() => setEmailModal(note.id)}
          className="inline-flex items-center gap-2 self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
        >
          <Download className="h-4 w-4" /> Download
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Study Notes"
        description="Downloadable MBA study notes organised by discipline — HRM, Strategic Management, OB, POM, Business Communication and more."
        path="/notes"
      />
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Page header */}
        <h1 className="mb-2 text-4xl font-bold text-foreground">Study Notes</h1>
        <p className="mb-8 text-muted-foreground">
          Downloadable notes organised by MBA discipline. Select a subject below to explore.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-10 w-full max-w-md rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* ── Discipline blocks ─────────────────────────────────────────── */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {disciplines.map(d => {
            const Icon = d.icon;
            const count = countFor(d.value);
            const isActive = activeSubject === d.value;
            return (
              <button
                key={d.value}
                onClick={() => {
                  setActiveSubject(isActive ? null : d.value);
                  setEnglishSub("all");
                  setSearch("");
                }}
                className={`group relative flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all duration-150 hover:shadow-md ${
                  isActive ? d.activeColor : d.color + " hover:brightness-95"
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${isActive ? "bg-white/20" : "bg-white"}`}>
                  <Icon className={`h-5 w-5 ${isActive ? "text-white" : d.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-700 leading-snug font-bold">{d.short}</span>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-white/25 text-white" : "bg-white/70"}`}>
                      {count} {count === 1 ? "note" : "notes"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug font-medium opacity-80 line-clamp-1">{d.label}</p>
                  <p className={`mt-1.5 text-xs leading-relaxed ${isActive ? "opacity-80" : "opacity-60"} line-clamp-2`}>{d.description}</p>
                </div>
                <ChevronRight className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "opacity-60 rotate-90" : ""}`} />
              </button>
            );
          })}
        </div>

        {/* ── Notes panel ───────────────────────────────────────────────── */}
        {activeSubject && activeDiscipline && (
          <section>
            {/* Section header */}
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <div className={`rounded-lg p-2 ${activeDiscipline.color}`}>
                <activeDiscipline.icon className={`h-5 w-5 ${activeDiscipline.iconColor}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{activeDiscipline.label}</h2>
                <p className="text-sm text-muted-foreground">{activeDiscipline.description}</p>
              </div>
            </div>

            {/* English subcategory pills */}
            {activeSubject === "english" && (
              <div className="mb-6 flex flex-wrap gap-2">
                {englishSubcategories.map(sub => (
                  <button
                    key={sub.value}
                    onClick={() => setEnglishSub(sub.value)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      englishSub === sub.value
                        ? "bg-accent text-accent-foreground"
                        : "border border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            {/* Notes grid */}
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground font-medium">No notes uploaded yet for this discipline.</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon — new material is added regularly.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </section>
        )}

        {/* Prompt to select when nothing is active */}
        {!activeSubject && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Select a discipline above to view its notes.</p>
          </div>
        )}
      </main>

      {/* Email capture modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-bold text-foreground">Enter your email to download</h3>
            <p className="mb-4 text-sm text-muted-foreground">We'll send you updates about new study materials.</p>
            <form onSubmit={handleDownload} className="space-y-3">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
                  {submitting ? "..." : "Download"}
                </button>
                <button type="button" onClick={() => setEmailModal(null)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default NotesPage;
