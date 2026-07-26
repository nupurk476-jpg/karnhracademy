import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import SecurePdfViewer from "@/components/SecurePdfViewer";
import { TagChip } from "@/components/LabourWelfareShared";
import { getSignedFileUrl } from "@/lib/signedFileUrl";
import { getUnitByNumber, unitRoman } from "@/lib/labourWelfareUnits";
import { getDiscipline } from "@/lib/disciplines";
import { ArrowLeft, ShieldCheck, FileText, FileCheck2, Loader2 } from "lucide-react";

const PYQViewerPage = () => {
  const { id } = useParams();
  const [pyq, setPyq] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [initialPage, setInitialPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [activeView, setActiveView] = useState<"paper" | "answerKey">("paper");
  const [answerKeyUrl, setAnswerKeyUrl] = useState<string | null>(null);
  const [resolvingAnswerKey, setResolvingAnswerKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: pyqRow, error } = await (supabase.from("pyq_papers" as any) as any)
        .select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error || !pyqRow) { setStatus("not-found"); return; }
      if (!pyqRow.file_url) { setStatus("error"); return; }

      const [url, { data: progress }] = await Promise.all([
        getSignedFileUrl(pyqRow.file_url, "pyq-papers", false),
        session
          ? (supabase.from("pyq_reading_progress" as any) as any)
              .select("last_page").eq("user_id", session.user.id).eq("pyq_id", id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      if (!url) { setStatus("error"); return; }

      setPyq(pyqRow);
      setFileUrl(url);
      if (progress?.last_page) setInitialPage(progress.last_page);
      setStatus("ready");

      supabase.rpc("increment_pyq_views" as any, { _pyq_id: id }).then(({ error: rpcError }: any) => {
        if (rpcError) console.error("view count failed", rpcError);
      });
    })();
    return () => { cancelled = true; };
  }, [id]);

  const saveProgress = async (page: number, totalPages: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await (supabase.from("pyq_reading_progress" as any) as any).upsert(
      { user_id: session.user.id, pyq_id: id, last_page: page, total_pages: totalPages },
      { onConflict: "user_id,pyq_id" },
    );
  };

  // Answer key URL is only minted on demand — most readers never open it,
  // so there's no reason to spend a signed-URL request on it up front.
  const showAnswerKey = async () => {
    setActiveView("answerKey");
    if (answerKeyUrl || !pyq?.answer_key_url) return;
    setResolvingAnswerKey(true);
    const url = await getSignedFileUrl(pyq.answer_key_url, "pyq-papers", false);
    setResolvingAnswerKey(false);
    setAnswerKeyUrl(url);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Loading Paper…" description="Loading previous year question paper." path={`/pyqs/view/${id}`} noindex />
        <Header />
        <main id="main-content" className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</main>
        <Footer />
      </div>
    );
  }

  if (status === "not-found" || status === "error") {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Paper Not Available" description="This previous year question paper isn't available." path={`/pyqs/view/${id}`} noindex />
        <Header />
        <main id="main-content" className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="mb-3 text-2xl font-bold text-foreground">
            {status === "not-found" ? "Paper not found" : "This paper couldn't be opened"}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {status === "not-found"
              ? "This previous year question paper doesn't exist or may have been removed."
              : "Something went wrong loading the file. Please try again shortly."}
          </p>
          <Link to="/pyqs" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
            <ArrowLeft className="h-4 w-4" /> Back to Previous Year Questions
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const discipline = getDiscipline(pyq.subject);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${pyq.title} — View Online`}
        description={`Read the ${pyq.title} previous year question paper online. View-only, secure reader — no download required.`}
        path={`/pyqs/view/${id}`}
        noindex
      />
      <Header />

      <main id="main-content" className="mx-auto max-w-4xl px-6 py-10">
        <Breadcrumbs items={[
          { label: "Home", to: "/" },
          { label: "Previous Year Questions", to: "/pyqs" },
          { label: pyq.title },
        ]} />

        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure Online Viewer
        </div>
        <h1 className="mb-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl" style={{ fontFamily: "'Sora', sans-serif" }}>
          {pyq.title}
        </h1>
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{pyq.year}</span>
          {discipline && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{discipline.short}</span>}
          {(pyq.unit_tags ?? []).map((n: number) => (
            <span key={n} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              Unit {unitRoman(n)}{getUnitByNumber(n) ? `: ${getUnitByNumber(n)!.title}` : ""}
            </span>
          ))}
          {(pyq.tags ?? []).map((t: string) => <TagChip key={t} tag={t} />)}
        </div>

        {pyq.answer_key_url && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setActiveView("paper")}
              aria-pressed={activeView === "paper"}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeView === "paper" ? "bg-accent text-accent-foreground" : "border border-border bg-white text-muted-foreground hover:bg-slate-50"
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Question Paper
            </button>
            <button
              onClick={showAnswerKey}
              aria-pressed={activeView === "answerKey"}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeView === "answerKey" ? "bg-accent text-accent-foreground" : "border border-border bg-white text-muted-foreground hover:bg-slate-50"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" /> Answer Key
            </button>
          </div>
        )}

        {activeView === "answerKey" && resolvingAnswerKey ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading answer key…
            </p>
          </div>
        ) : activeView === "answerKey" && answerKeyUrl ? (
          <SecurePdfViewer key={answerKeyUrl} fileUrl={answerKeyUrl} />
        ) : (
          <SecurePdfViewer key={fileUrl} fileUrl={fileUrl!} initialPage={initialPage} onPageChange={saveProgress} />
        )}

        <div className="mt-6 text-center">
          <Link to="/pyqs" className="text-sm font-medium text-accent hover:underline">
            ← Back to Previous Year Questions
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PYQViewerPage;
