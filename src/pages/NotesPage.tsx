import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download } from "lucide-react";

const NotesPage = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [emailModal, setEmailModal] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setNotes(data));
  }, []);

  const filtered = notes.filter(n =>
    !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !emailModal) return;
    setSubmitting(true);
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setSubmitting(false);
    setEmailModal(null);
    setEmail("");
    // Open the file URL
    const note = notes.find(n => n.id === emailModal);
    if (note?.file_url) {
      window.open(note.file_url, "_blank");
    } else {
      toast({ title: "Download unavailable", description: "No file attached to this note." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Study Notes</h1>
        <p className="mb-10 text-muted-foreground">Downloadable notes for MBA, BBA, and UGC NET preparation.</p>

        {notes.length === 0 ? (
          <p className="text-muted-foreground">No notes available yet. Check back soon!</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <div key={note.id} className="flex flex-col rounded-lg border border-border bg-card p-6">
                <FileText className="mb-3 h-10 w-10 text-accent" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">{note.title}</h3>
                <p className="mb-4 flex-1 text-sm text-muted-foreground">{note.description}</p>
                <button
                  onClick={() => setEmailModal(note.id)}
                  className="inline-flex items-center gap-2 self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
              </div>
            ))}
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
