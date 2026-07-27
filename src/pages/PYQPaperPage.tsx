import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getDiscipline } from "@/lib/disciplines";
import { getUnitByNumber, unitRoman } from "@/lib/labourWelfareUnits";
import {
  ScrollText, BookOpenCheck, LogIn, FileCheck2, Eye, ShieldCheck, CalendarDays,
} from "lucide-react";

// Public, indexable landing page for one previous-year paper — the SEO
// front door for searches like "UGC NET labour welfare June 2014 paper".
// Reading the actual PDF stays behind sign-in (/pyqs/view/:id); this page
// only carries the paper's metadata and the call-to-action.
const PYQPaperPage = () => {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<any | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase.from("pyq_papers" as any) as any)
        .select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error || !data) { setStatus("missing"); return; }
      setPaper(data);
      setStatus("ready");

      const { data: rel } = await (supabase.from("pyq_papers" as any) as any)
        .select("id, title, year, answer_key_url")
        .neq("id", id)
        .order("year", { ascending: false })
        .limit(6);
      if (!cancelled && rel) setRelated(rel);
    })();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setSignedIn(!!session?.user);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32 text-muted-foreground">Loading…</div>
        <Footer />
      </div>
    );
  }

  if (status === "missing" || !paper) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Paper not found</h1>
          <p className="mb-6 text-sm text-muted-foreground">This paper may have been removed.</p>
          <Link to="/pyqs" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
            <ScrollText className="h-4 w-4" /> Browse all papers
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const discipline = getDiscipline(paper.subject);
  const subjectLabel = discipline?.label ?? "HR & Management";
  const seoTitle = `${paper.title} (${paper.year})`;
  const seoDescription = `${paper.title} — ${paper.year} previous year question paper for ${subjectLabel}${paper.answer_key_url ? ", with answer key" : ""}. Read online free on Karn HR Academy (sign-in required).`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        path={`/pyqs/paper/${paper.id}`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "LearningResource",
            name: paper.title,
            description: seoDescription,
            learningResourceType: "Previous year question paper",
            about: subjectLabel,
            datePublished: String(paper.year),
            provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: "https://karnhracademy.com" },
            isAccessibleForFree: true,
            inLanguage: "en",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://karnhracademy.com/" },
              { "@type": "ListItem", position: 2, name: "Previous Year Questions", item: "https://karnhracademy.com/pyqs" },
              { "@type": "ListItem", position: 3, name: paper.title, item: `https://karnhracademy.com/pyqs/paper/${paper.id}` },
            ],
          },
        ]}
      />
      <Header />

      <main id="main-content" className="mx-auto max-w-4xl px-6 py-10">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Previous Year Questions", to: "/pyqs" }, { label: paper.title }]} />

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {discipline && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{discipline.short}</span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            <CalendarDays className="h-3 w-3" /> {paper.year}
          </span>
          {(paper.unit_tags ?? []).map((n: number) => (
            <span key={n} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
              Unit {unitRoman(n)}{getUnitByNumber(n) ? `: ${getUnitByNumber(n)!.title}` : ""}
            </span>
          ))}
          {paper.answer_key_url && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <FileCheck2 className="h-3 w-3" /> Answer key included
            </span>
          )}
        </div>

        <h1 className="mb-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl" style={{ fontFamily: "'Sora', sans-serif" }}>
          {paper.title}
        </h1>

        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Original {paper.year} previous year question paper for {subjectLabel}
          {paper.answer_key_url ? ", complete with its official answer key" : ""}. Read it free in our
          secure online viewer — with page navigation, zoom, in-paper search and automatic reading-progress
          tracking, so you can pick up exactly where you left off.
        </p>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          {signedIn ? (
            <Link
              to={`/pyqs/view/${paper.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-accent-foreground hover:brightness-110"
            >
              <BookOpenCheck className="h-4 w-4" /> Read Online
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                state={{ from: `/pyqs/view/${paper.id}` }}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-accent-foreground hover:brightness-110"
              >
                <LogIn className="h-4 w-4" /> Sign in free to read
              </Link>
              <span className="text-xs text-muted-foreground">Free account · takes under a minute</span>
            </>
          )}
          {(paper.view_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> {paper.view_count} reads
            </span>
          )}
        </div>

        <div className="mb-10 flex items-start gap-2.5 rounded-lg border border-border bg-slate-50 p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Papers are provided for online viewing only, to keep them freely available for every aspirant.
            Your reading position is saved automatically so you can continue any time from any device.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="mb-2 text-lg font-bold text-foreground">How to use this paper</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Attempt the paper under exam timing first, then check your answers
            {paper.answer_key_url ? " against the included answer key" : ""}. Revise weak areas with the{" "}
            <Link to="/ugc-net-labour-welfare" className="text-accent hover:underline">unit-wise study hub</Link>, read the matching{" "}
            <Link to="/notes" className="text-accent hover:underline">study notes</Link>, and drill{" "}
            <Link to="/quizzes" className="text-accent hover:underline">topic-wise MCQs</Link> until the pattern sticks.
          </p>
        </section>

        {related.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold text-foreground">More previous year papers</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {related.map(r => (
                <Link
                  key={r.id}
                  to={`/pyqs/paper/${r.id}`}
                  className="group flex items-center justify-between gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:border-accent/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.year}{r.answer_key_url ? " · answer key included" : ""}
                    </p>
                  </div>
                  <ScrollText className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PYQPaperPage;
