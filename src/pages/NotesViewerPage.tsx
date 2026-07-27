import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import SecurePdfViewer from "@/components/SecurePdfViewer";
import { getSignedFileUrl } from "@/lib/signedFileUrl";
import { getDiscipline, getTopicLabel } from "@/lib/disciplines";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useDownloadGate } from "@/hooks/use-download-gate";

// In-app reader for PDF notes — the same branded viewer PYQ papers use
// (page nav, zoom, in-paper search, watermark) instead of bouncing the
// student to a bare browser tab. Notes stay free to read without an
// account, matching the listing pages; the Download button keeps the
// one-time email gate.
const NotesViewerPage = () => {
  const { id } = useParams<{ id: string }>();
  const { request, GateDialog } = useDownloadGate();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [urlFailed, setUrlFailed] = useState(false);

  const { data: note, isPending } = useQuery({
    queryKey: ["note", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Signed URL is short-lived, so it's resolved per visit (not cached) and
  // never rendered as a link — the viewer fetches raw bytes from it.
  useEffect(() => {
    if (!note?.file_url) return;
    let cancelled = false;
    getSignedFileUrl(note.file_url, "notes", false).then(url => {
      if (cancelled) return;
      if (url) setFileUrl(url); else setUrlFailed(true);
    });
    supabase.rpc("increment_note_views" as any, { _note_id: note.id }).then(({ error }) => {
      if (error) console.error("view count failed", error);
    });
    return () => { cancelled = true; };
  }, [note]);

  const download = () => {
    if (!note?.file_url) return;
    request(() => getSignedFileUrl(note.file_url, "notes", true), () => {});
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32 text-muted-foreground">Loading…</div>
        <Footer />
      </div>
    );
  }

  if (!note || !note.file_url) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Note not found</h1>
          <p className="mb-6 text-sm text-muted-foreground">This note may have been removed, or has no file attached.</p>
          <Link to="/notes" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
            <ArrowLeft className="h-4 w-4" /> Browse all notes
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const subjectShort = getDiscipline(note.subject || "hrm")?.short ?? "HRM";

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${note.title} — Read Online`} description={note.description || `Read ${note.title} online free on Karn HR Academy.`} path={`/notes/view/${note.id}`} noindex />
      <Header />

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Study Notes", to: "/notes" }, { label: note.title }]} />

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">{note.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {subjectShort}{note.topic_slug ? ` · ${getTopicLabel(note.topic_slug)}` : ""}
            </p>
          </div>
          <button
            onClick={download}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
          >
            <Download className="h-4 w-4" /> Download
          </button>
        </div>

        {urlFailed ? (
          <div className="rounded-xl border border-border bg-card py-20 text-center text-sm text-muted-foreground">
            Couldn't open this note right now — please try again in a moment.
          </div>
        ) : !fileUrl ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing note…
            </p>
          </div>
        ) : (
          <SecurePdfViewer fileUrl={fileUrl} />
        )}
      </main>

      <GateDialog />
      <Footer />
    </div>
  );
};

export default NotesViewerPage;
