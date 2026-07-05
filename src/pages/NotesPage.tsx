import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download } from "lucide-react";
import { DISCIPLINES } from "@/lib/disciplines";

const NotesPage = () => {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState<any[]>([]);
  const [emailModal, setEmailModal] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const requestedSubject = searchParams.get("subject");
  const hadUrlParam = !!(requestedSubject && DISCIPLINES.some(d => d.value === requestedSubject));
  const [activeSubject, setActiveSubject] = useState<string>(hadUrlParam ? requestedSubject! : "hrm");
  const [activeTopic, setActiveTopic] = useState("all");
  const [touched, setTouched] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) { console.error("NotesPage: failed to load notes", error); return; }
      if (data) setNotes(data);
    });
  }, []);

  // Single source of truth for "does this note belong to this discipline?"
  // (legacy HRM notes were saved with subject = null before the column existed).
  const noteMatchesSubject = (n: any, value: string) =>
    value === "hrm" ? (!n.subject || n.subject === "hrm") : n.subject === value;

  const countFor = (value: string) => notes.filter(n => noteMatchesSubject(n, value)).length;

  // Content-first: if the visitor didn't request a subject and the default has no
  // notes, auto-select the first discipline that does, so they land on content.
  useEffect(() => {
    if (touched || hadUrlParam || notes.length === 0) return;
    if (countFor(activeSubject) > 0) return;
    const firstWithContent = DISCIPLINES.find(d => notes.some(n => noteMatchesSubject(n, d.value)));
    if (firstWithContent) setActiveSubject(firstWithContent.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const filtered = notes.filter(n => {
    const matchesSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (!noteMatchesSubject(n, activeSubject)) return false;
    if (activeTopic !== "all" && n.topic_slug !== activeTopic) return false;
    return true;
  });

  const activeDiscipline = DISCIPLINES.find(d => d.value === activeSubject);
  const subjectNotes = notes.filter(n => noteMatchesSubject(n, activeSubject));
  const topicsWithNotes = activeDiscipline
    ? activeDiscipline.topics.filter(t => subjectNotes.some(n => n.topic_slug === t.slug))
    : [];

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

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Study Notes</h1>
            <p className="mt-1 text-muted-foreground">Pick your subject to browse downloadable, exam-aligned notes.</p>
          </div>
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </div>

        {/* Compact discipline selector */}
        <div className="mb-8 flex flex-wrap gap-2">
          {DISCIPLINES.map(d => {
            const Icon = d.icon;
            const count = countFor(d.value);
            const isActive = activeSubject === d.value;
            return (
              <button
                key={d.value}
                onClick={() => { setActiveSubject(d.value); setActiveTopic("all"); setTouched(true); }}
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? d.activeColor + " shadow-sm"
                    : count > 0
                      ? d.color + " hover:brightness-95"
                      : "border-border bg-card text-muted-foreground/70 hover:bg-muted"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : count > 0 ? d.iconColor : ""}`} />
                <span className="whitespace-nowrap">{d.short}</span>
                {count > 0 && (
                  <span className={`rounded-full px-1.5 text-xs font-semibold ${isActive ? "bg-white/25 text-white" : "bg-white/80 text-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notes panel */}
        {activeDiscipline && (
          <section>
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
              <div className={`rounded-lg p-2 ${activeDiscipline.color}`}>
                <activeDiscipline.icon className={`h-5 w-5 ${activeDiscipline.iconColor}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{activeDiscipline.label}</h2>
                <p className="text-sm text-muted-foreground">{activeDiscipline.description}</p>
              </div>
            </div>

            {/* Topic filter — only surface topics that actually have notes */}
            {topicsWithNotes.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTopic("all")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTopic === "all" ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All
                </button>
                {topicsWithNotes.map(t => (
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
            )}

            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground font-medium">No notes uploaded yet for {activeDiscipline.label}.</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon — new material is added regularly.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </section>
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
