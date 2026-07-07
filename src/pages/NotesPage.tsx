import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Eye, LayoutGrid, List, Calendar, PlayCircle } from "lucide-react";
import { DISCIPLINES, getTopicLabel, getDiscipline } from "@/lib/disciplines";

const PAGE_SIZE = 30;
const EMAIL_KEY = "khr_subscriber_email";

const formatSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const SORTS = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "alpha", label: "A–Z" },
  { value: "views", label: "Most Viewed" },
] as const;

const NotesPage = () => {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const requestedSubject = searchParams.get("subject");
  const hadUrlParam = !!(requestedSubject && DISCIPLINES.some(d => d.value === requestedSubject));
  const [activeSubject, setActiveSubject] = useState<string>(hadUrlParam ? requestedSubject! : "hrm");
  const [activeTopic, setActiveTopic] = useState("all");
  const [touched, setTouched] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("latest");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Email gate: asked once, remembered locally. pendingNote is opened after the gate.
  const [gateOpen, setGateOpen] = useState(false);
  const pendingNote = useRef<{ note: any; mode: "view" | "download" } | null>(null);
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

  const filtered = useMemo(() => {
    const list = notes.filter(n => {
      const matchesSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (!noteMatchesSubject(n, activeSubject)) return false;
      if (activeTopic !== "all" && n.topic_slug !== activeTopic) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === "latest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "oldest") sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (sort === "alpha") sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (sort === "views") sorted.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, search, activeSubject, activeTopic, sort]);

  // Reset pagination whenever the result set changes shape.
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, activeSubject, activeTopic, sort]);
  const visible = filtered.slice(0, visibleCount);

  const activeDiscipline = DISCIPLINES.find(d => d.value === activeSubject);
  const subjectNotes = notes.filter(n => noteMatchesSubject(n, activeSubject));
  const topicsWithNotes = activeDiscipline
    ? activeDiscipline.topics.filter(t => subjectNotes.some(n => n.topic_slug === t.slug))
    : [];

  // ── Email gate + open/download ───────────────────────────────────────────
  const recordView = (note: any) => {
    supabase.rpc("increment_note_views" as any, { _note_id: note.id }).then(({ error }) => {
      if (error) console.error("view count failed", error);
    });
  };

  const noteUrl = (note: any, mode: "view" | "download") =>
    // Supabase public storage supports ?download to force a file download.
    mode === "download" && note.file_url ? `${note.file_url}?download` : note.file_url;

  const requestNote = (note: any, mode: "view" | "download") => {
    const url = noteUrl(note, mode);
    if (!url) { toast({ title: "No file attached to this note." }); return; }
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) {
      recordView(note);
      window.open(url, "_blank"); // synchronous within the click — popup-safe
      return;
    }
    pendingNote.current = { note, mode };
    setGateOpen(true);
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pendingNote.current) return;
    const { note, mode } = pendingNote.current;
    const url = noteUrl(note, mode);
    // Open the tab synchronously (within the submit click's call stack) so the
    // browser doesn't treat it as an unrequested popup after the await below.
    const win = url ? window.open("", "_blank") : null;
    setSubmitting(true);
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setSubmitting(false);
    localStorage.setItem(EMAIL_KEY, email.trim());
    setGateOpen(false);
    setEmail("");
    pendingNote.current = null;
    if (url && win) { recordView(note); win.location.href = url; }
    else win?.close();
  };

  // ── Note renderers ───────────────────────────────────────────────────────
  const Badges = ({ note }: { note: any }) => (
    <>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
        {getDiscipline(note.subject || "hrm")?.short ?? "HRM"}
      </span>
      {note.topic_slug && (
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
          {getTopicLabel(note.topic_slug)}
        </span>
      )}
      {note.video_url && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EEF0F8] px-2 py-0.5 text-[11px] font-semibold text-[#3D6C98]">
          <PlayCircle className="h-3 w-3" /> Video
        </span>
      )}
    </>
  );

  const Meta = ({ note }: { note: any }) => (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(note.created_at)}</span>
      {formatSize(note.file_size) && <span>{formatSize(note.file_size)}</span>}
      {(note.view_count ?? 0) > 0 && <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {note.view_count} views</span>}
    </span>
  );

  const Actions = ({ note }: { note: any }) => (
    <div className="flex shrink-0 items-center gap-2">
      {note.video_url && (
        <button onClick={() => { recordView(note); window.open(note.video_url, "_blank"); }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
          <PlayCircle className="h-3.5 w-3.5" /> Watch
        </button>
      )}
      {note.file_url && (
        <>
          <button onClick={() => requestNote(note, "view")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <button onClick={() => requestNote(note, "download")}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:brightness-110">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </>
      )}
    </div>
  );

  const ListRow = ({ note }: { note: any }) => (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-snug text-foreground">{note.title}</h3>
          <Badges note={note} />
        </div>
        {note.description && <p className="mb-1.5 line-clamp-1 text-xs text-muted-foreground">{note.description}</p>}
        <Meta note={note} />
      </div>
      <Actions note={note} />
    </div>
  );

  const GridCard = ({ note }: { note: any }) => (
    <div className="flex flex-col rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {note.video_url && <video src={note.video_url} controls className="mb-3 aspect-video w-full rounded-md bg-black" />}
      <div className="mb-1.5 flex flex-wrap items-center gap-2"><Badges note={note} /></div>
      <h3 className="mb-1.5 text-base font-semibold leading-snug text-foreground">{note.title}</h3>
      {note.description && <p className="mb-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{note.description}</p>}
      <div className="mb-3"><Meta note={note} /></div>
      <Actions note={note} />
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
        <div className="mb-6 flex flex-wrap gap-2">
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
                  isActive ? d.activeColor + " shadow-sm" : count > 0 ? d.color + " hover:brightness-95" : "border-border bg-card text-muted-foreground/70 hover:bg-muted"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : count > 0 ? d.iconColor : ""}`} />
                <span className="whitespace-nowrap">{d.short}</span>
                {count > 0 && (
                  <span className={`rounded-full px-1.5 text-xs font-semibold ${isActive ? "bg-white/25 text-white" : "bg-white/80 text-foreground"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {activeDiscipline && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${activeDiscipline.color}`}>
                  <activeDiscipline.icon className={`h-5 w-5 ${activeDiscipline.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{activeDiscipline.label}</h2>
                  <p className="text-sm text-muted-foreground">{activeDiscipline.description}</p>
                </div>
              </div>
              {/* Sort + view toggle */}
              <div className="flex items-center gap-2">
                <select value={sort} onChange={e => setSort(e.target.value as any)} aria-label="Sort notes"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="flex overflow-hidden rounded-md border border-border">
                  <button onClick={() => setViewMode("list")} aria-label="List view" aria-pressed={viewMode === "list"}
                    className={`p-2 ${viewMode === "list" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                    <List className="h-4 w-4" />
                  </button>
                  <button onClick={() => setViewMode("grid")} aria-label="Grid view" aria-pressed={viewMode === "grid"}
                    className={`p-2 ${viewMode === "grid" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
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
                <p className="font-medium text-muted-foreground">No notes uploaded yet for {activeDiscipline.label}.</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon — new material is added regularly.</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "note" : "notes"}</p>
                {viewMode === "list" ? (
                  <div className="space-y-2.5">
                    {visible.map(note => <ListRow key={note.id} note={note} />)}
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map(note => <GridCard key={note.id} note={note} />)}
                  </div>
                )}
                {visibleCount < filtered.length && (
                  <div className="mt-6 text-center">
                    <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                      className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
                      Load more ({filtered.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {/* One-time email gate */}
      <Dialog open={gateOpen} onOpenChange={(open) => { if (!open) { setGateOpen(false); pendingNote.current = null; } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter your email to continue</DialogTitle>
            <DialogDescription>One-time step — we'll remember you on this device and send occasional updates about new study materials.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGateSubmit} className="space-y-3">
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
                {submitting ? "..." : "Continue"}
              </button>
              <button type="button" onClick={() => { setGateOpen(false); pendingNote.current = null; }} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
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
