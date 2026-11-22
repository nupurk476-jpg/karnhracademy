import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import SecurePdfViewer from "@/components/SecurePdfViewer";
import ContentLoadError from "@/components/ContentLoadError";
import { getSignedFileUrl, isPdfFile } from "@/lib/signedFileUrl";
import { getDiscipline, getTopicLabel } from "@/lib/disciplines";
import { ArrowLeft, Download, Loader2, Lock } from "lucide-react";
import BuyButton from "@/components/BuyButton";
import { formatRupees } from "@/lib/programmes";
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
  // null while checking. Free notes skip the check entirely.
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessVersion, setAccessVersion] = useState(0);

  const { data: note, isPending, isError } = useQuery({
    queryKey: ["note", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!note) return;
    if (note.is_free !== false) { setHasAccess(true); return; }
    let cancelled = false;
    setHasAccess(null);
    (supabase.rpc as any)("has_note_access", { _note_id: note.id }).then(({ data }: any) => {
      if (!cancelled) setHasAccess(!!data);
    });
    return () => { cancelled = true; };
  }, [note, accessVersion]);

  // Paid courses that include this note: buying one of those unlocks it too.
  const { data: viaCourses } = useQuery({
    queryKey: ["note-courses", id],
    enabled: !!note && note.is_free === false && hasAccess === false,
    queryFn: async () => {
      const { data } = await (supabase.from("course_items" as any) as any)
        .select("courses(slug, title, price_paise, is_free, is_published)")
        .eq("kind", "note").eq("ref_id", id!);
      return ((data ?? []) as any[]).map(r => r.courses).filter((c: any) => c && c.is_published);
    },
  });

  // Signed URL is short-lived, so it's resolved per visit (not cached) and
  // never rendered as a link — the viewer fetches raw bytes from it.
  useEffect(() => {
    if (!note?.file_url || !hasAccess || !isPdfFile(note.file_url)) return;
    let cancelled = false;
    getSignedFileUrl(note.file_url, "notes", false).then(url => {
      if (cancelled) return;
      if (url) setFileUrl(url); else setUrlFailed(true);
    });
    supabase.rpc("increment_note_views" as any, { _note_id: note.id }).then(({ error }) => {
      if (error) console.error("view count failed", error);
    });
    return () => { cancelled = true; };
  }, [note, hasAccess]);

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

  // Checked before the not-found branch below: a failed request is not a
  // deleted note, and telling a student their note "may have been removed"
  // because the API was unreachable is the worse of the two errors.
  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-24">
          <ContentLoadError what="this note" />
        </main>
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
          {hasAccess && <button
            onClick={download}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
          >
            <Download className="h-4 w-4" /> Download
          </button>}
        </div>

        {hasAccess === false ? (
          <div className="rounded-xl border border-border bg-card px-6 py-14 text-center">
            <Lock aria-hidden="true" className="mx-auto h-8 w-8 text-accent-deep" />
            <h2 className="mt-3 font-display text-xl font-bold text-foreground">This is a premium note</h2>
            {note.price_paise >= 100 ? (
              <>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Buy it once for {formatRupees(note.price_paise)} to read and download it any time.
                </p>
                <BuyButton
                  itemType="note"
                  itemId={note.id}
                  pricePaise={note.price_paise}
                  onPurchased={() => setAccessVersion(v => v + 1)}
                  className="mt-5"
                />
              </>
            ) : (
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                It's included with the course below.
              </p>
            )}
            {(viaCourses?.length ?? 0) > 0 && (
              <div className="mx-auto mt-6 max-w-md border-t border-border pt-4 text-sm">
                <p className="text-muted-foreground">Also unlocked by buying:</p>
                <ul className="mt-2 space-y-1">
                  {viaCourses!.map((c: any) => (
                    <li key={c.slug}>
                      <Link to={`/courses/${c.slug}`} className="font-semibold text-accent-deep hover:underline">
                        {c.title}{!c.is_free && ` — ${formatRupees(c.price_paise)}`}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : hasAccess && !isPdfFile(note.file_url) ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">This file can't be previewed in the browser.</p>
            <button
              onClick={download}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
            >
              <Download className="h-4 w-4" /> Download it
            </button>
          </div>
        ) : urlFailed ? (
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
