import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, BookOpen, Languages, Briefcase, Users, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

const NotesPage = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [emailModal, setEmailModal] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState("hrm");
  const [englishSub, setEnglishSub] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setNotes(data));
  }, []);

  const filtered = notes.filter(n => {
    const matchesSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeSubject === "english") {
      if (n.subject !== "english") return false;
      if (englishSub !== "all" && n.topic_slug !== englishSub) return false;
      return true;
    }
    if (activeSubject === "pom") {
      return n.subject === "pom";
    }
    if (activeSubject === "ob") {
      return n.subject === "ob";
    }
    if (activeSubject === "sm") {
      return n.subject === "sm";
    }
    // HRM tab: notes without subject or subject=hrm
    return !n.subject || n.subject === "hrm";
  });

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
    <div className="flex flex-col rounded-lg border border-border bg-card p-6">
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
        title="Notes"
        description="Downloadable HRM, English, and exam-preparation notes for MBA, BBA, and UGC NET HR aspirants."
        path="/notes"
      />
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Study Notes</h1>
        <p className="mb-6 text-muted-foreground">Downloadable notes for MBA, BBA, and UGC NET preparation.</p>
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-8 w-full max-w-md rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <Tabs value={activeSubject} onValueChange={setActiveSubject} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="hrm" className="gap-2">
              <BookOpen className="h-4 w-4" /> HRM
            </TabsTrigger>
            <TabsTrigger value="english" className="gap-2">
              <Languages className="h-4 w-4" /> English
            </TabsTrigger>
            <TabsTrigger value="pom" className="gap-2">
              <Briefcase className="h-4 w-4" /> Management
            </TabsTrigger>
            <TabsTrigger value="ob" className="gap-2">
              <Users className="h-4 w-4" /> OB
            </TabsTrigger>
            <TabsTrigger value="sm" className="gap-2">
              <Target className="h-4 w-4" /> SM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hrm">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground">No HRM notes available yet.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="english">
            {/* English subcategory pills */}
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

            {filtered.length === 0 ? (
              <p className="text-muted-foreground">No English notes available yet for this category.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pom">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground">No Management notes available yet.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ob">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground">No Organizational Behaviour notes available yet.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sm">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground">No Strategic Management notes available yet.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Email capture modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-bold text-foreground">Enter your email to download</h3>
            <p className="mb-4 text-sm text-muted-foreground">We'll send you updates about new study materials.</p>
            <form onSubmit={handleDownload} className="space-y-3">
              <input type="email" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
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
