import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, BookOpen, ChevronRight } from "lucide-react";
import { DISCIPLINES } from "@/lib/disciplines";

const NotesPage = () => {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState<any[]>([]);
  const [emailModal, setEmailModal] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(() => {
    const requested = searchParams.get("subject");
    return requested && DISCIPLINES.some(d => d.value === requested) ? requested : null;
  });
  const [activeTopic, setActiveTopic] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setNotes(data));
  }, []);

  const countFor = (value: string) =>
    notes.filter(n => value === "hrm" ? (!n.subject || n.subject === "hrm") : n.subject === value).length;

  const filtered = notes.filter(n => {
    if (!activeSubject) return false;
    const matchesSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeSubject === "hrm" ? (!n.subject || n.subject === "hrm") : n.subject !== activeSubject) return false;
    if (activeTopic !== "all" && n.topic_slug !== activeTopic) return false;
    return true;
  });

  const activeDiscipline = DISCIPLINES.find(d => d.value === activeSubject);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !emailModal) return;
    // Open the tab synchronously (within the click's call stack) so browsers
    // don't treat it as an unrequested popup once the awaited call resolves.
    const downloadWindow = window.open("", "_blank");
    setSubmitting(true);
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setSubmitting(false);
    setEmailModal(null);
    setEmail("");
    const note = notes.find(n => n.id === emailModal);
    if (note?.file_url && downloadWindow) {
      downloadWindow.location.href = note.file_url;
    } else {
      downloadWindow?.close();
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
        <h1 className="mb-2 text-4xl font-bold text-foreground">Study Notes</h1>
        <p className="mb-8 text-muted-foreground">
          Downloadable notes organised by MBA discipline. Select a subject below to explore.
        </p>

        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-10 w-full max-w-md rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Discipline blocks */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISCIPLINES.map(d => {
            const Icon = d.icon;
            const count = countFor(d.value);
            const isActive = activeSubject === d.value;
            return (
              <button
                key={d.value}
                onClick={() => {
                  setActiveSubject(isActive ? null : d.value);
                  setActiveTopic("all");
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
                    <span className="text-sm font-bold leading-snug">{d.short}</span>
                    {count > 0 ? (
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-white/25 text-white" : "bg-white/70"}`}>
                        {count} {count === 1 ? "note" : "notes"}
                      </span>
                    ) : (
                      <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-snug font-medium opacity-80 line-clamp-1">{d.label}</p>
                  <p className={`mt-1.5 text-xs leading-relaxed ${isActive ? "opacity-80" : "opacity-60"} line-clamp-2`}>{d.description}</p>
                </div>
                <ChevronRight className={`absolute right-3 bottom-3 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "opacity-60 rotate-90" : ""}`} />
              </button>
            );
          })}
        </div>

        {/* Notes panel */}
        {activeSubject && activeDiscipline && (
          <section>
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <div className={`rounded-lg p-2 ${activeDiscipline.color}`}>
                <activeDiscipline.icon className={`h-5 w-5 ${activeDiscipline.iconColor}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{activeDiscipline.label}</h2>
                <p className="text-sm text-muted-foreground">{activeDiscipline.description}</p>
              </div>
            </div>

            {/* Topic pills for all disciplines */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTopic("all")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTopic === "all" ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                All
              </button>
              {activeDiscipline.topics.map(t => (
                <button
                  key={t.slug}
                  onClick={() => setActiveTopic(t.slug)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTopic === t.slug ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

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

        {!activeSubject && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Select a discipline above to view its notes.</p>
          </div>
        )}
      </main>

      <Dialog open={!!emailModal} onOpenChange={(open) => !open && setEmailModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter your email to download</DialogTitle>
            <DialogDescription>We'll send you updates about new study materials.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDownload} className="space-y-3">
            <input
              type="email"
              required
              autoFocus
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
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default NotesPage;
