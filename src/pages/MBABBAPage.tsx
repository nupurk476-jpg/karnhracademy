import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DISCIPLINES } from "@/lib/disciplines";
import {
  ArrowRight, FileText, HelpCircle, PlayCircle, BookOpen,
  GraduationCap, Layers, ChevronRight,
} from "lucide-react";

// Same mapping SearchPage uses — discipline value → topic-page route prefix.
const TOPIC_ROUTE_PREFIX: Record<string, string> = {
  hrm: "hr", ob: "ob", sm: "sm", pom: "pom", bc: "bc", odcm: "odcm", ghr: "ghr",
};

// The 7 semester-programme disciplines — everything except the UGC NET
// Labour Welfare hub, which has its own dedicated page.
const PROGRAMME_DISCIPLINES = DISCIPLINES.filter(d => d.value !== "lw");

// Curated semester guidance — which subject typically lands in which
// semester of Indian BBA/MBA programmes. This is the page's unique
// editorial content (varies slightly by university; framed as "typically").
const SEMESTER_GUIDE = [
  {
    programme: "BBA / B.Com",
    rows: [
      { sem: "Sem 1–2", subjects: ["Principles of Management", "Business Communication"] },
      { sem: "Sem 3–4", subjects: ["Organisational Behaviour", "Human Resource Management"] },
      { sem: "Sem 5–6", subjects: ["Strategic Management", "OD & Change Management (elective)"] },
    ],
  },
  {
    programme: "MBA / PGDM",
    rows: [
      { sem: "Sem 1", subjects: ["Principles of Management", "Organisational Behaviour", "Business Communication"] },
      { sem: "Sem 2", subjects: ["Human Resource Management", "Strategic Management"] },
      { sem: "Sem 3–4 (HR specialisation)", subjects: ["OD & Change Management", "International HRM Practices"] },
    ],
  },
];

const MBABBAPage = () => {
  const [counts, setCounts] = useState<{ notes: Record<string, number>; quizzes: Record<string, number>; lectures: Record<string, number> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: noteRows }, { data: quizRows }, { data: lectureRows }] = await Promise.all([
        supabase.from("notes").select("subject"),
        (supabase.from("quizzes") as any).select("subject, published"),
        (supabase.from("lectures" as any) as any).select("subject"),
      ]);
      if (cancelled) return;
      const tally = (rows: any[] | null, filter?: (r: any) => boolean) => {
        const out: Record<string, number> = {};
        (rows ?? []).filter(r => !filter || filter(r)).forEach((r: any) => {
          const s = r.subject || "hrm";
          out[s] = (out[s] || 0) + 1;
        });
        return out;
      };
      setCounts({
        notes: tally(noteRows),
        quizzes: tally(quizRows, (q: any) => q.published !== false),
        lectures: tally(lectureRows),
      });
    })();
    return () => { cancelled = true; };
  }, []);

  const total = (kind: "notes" | "quizzes" | "lectures") =>
    counts ? PROGRAMME_DISCIPLINES.reduce((sum, d) => sum + (counts[kind][d.value] || 0), 0) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="MBA / BBA HR & Management Studies — Notes, MCQs & Video Lectures"
        description="Free semester-wise study resources for MBA, BBA, PGDM and B.Com students — HRM, Organisational Behaviour, Principles of Management, Strategic Management, Business Communication, OD & Change Management and International HRM notes, MCQ practice sets and video lectures."
        path="/mba-bba"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: "MBA / BBA HR & Management Studies Hub",
          description: "Free notes, MCQ practice and video lectures across seven core HR & Management subjects for MBA, BBA, PGDM and B.Com students.",
          provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: "https://karnhracademy.com" },
          isAccessibleForFree: true,
          inLanguage: "en",
          hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
        }}
      />
      <Header />

      <main id="main-content">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "MBA / BBA Hub" }]} />

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">MBA · BBA · PGDM · B.Com</p>
            <h1 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              MBA / BBA Management Studies Hub
            </h1>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Seven core HR &amp; Management subjects — from Principles of Management in your first semester to
              OD &amp; Change Management and International HRM in specialisation — with study notes, topic-wise
              MCQ practice and video lectures, all free.
            </p>

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><Layers className="h-3.5 w-3.5 text-accent" /><strong className="text-foreground">{PROGRAMME_DISCIPLINES.length}</strong>&nbsp;Subjects</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><FileText className="h-3.5 w-3.5 text-accent" /><strong className="text-foreground">{total("notes") ?? "…"}</strong>&nbsp;Notes</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><HelpCircle className="h-3.5 w-3.5 text-accent" /><strong className="text-foreground">{total("quizzes") ?? "…"}</strong>&nbsp;MCQ Sets</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><PlayCircle className="h-3.5 w-3.5 text-accent" /><strong className="text-foreground">{total("lectures") ?? "…"}</strong>&nbsp;Video Lectures</span>
            </div>
          </div>
        </section>

        {/* ── Semester guide ───────────────────────────────────────────── */}
        <section className="border-b border-border bg-slate-50 py-10" aria-labelledby="semester-guide-heading">
          <div className="mx-auto max-w-6xl px-6">
            <h2 id="semester-guide-heading" className="mb-1 text-lg font-bold text-foreground">Which subject in which semester?</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Typical placement across Indian universities — your programme may vary slightly, but this is the usual order.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {SEMESTER_GUIDE.map(g => (
                <div key={g.programme} className="rounded-lg border border-border bg-white p-5">
                  <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <GraduationCap className="h-4 w-4 text-accent" /> {g.programme}
                  </p>
                  <div className="space-y-2.5">
                    {g.rows.map(r => (
                      <div key={r.sem} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                        <span className="w-40 flex-shrink-0 text-xs font-bold uppercase tracking-wide text-accent">{r.sem}</span>
                        <span className="text-sm text-muted-foreground">{r.subjects.join(" · ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Subject cards ────────────────────────────────────────────── */}
        <section className="py-10" aria-labelledby="subjects-heading">
          <div className="mx-auto max-w-6xl px-6">
            <h2 id="subjects-heading" className="mb-4 text-lg font-bold text-foreground">Browse by Subject</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {PROGRAMME_DISCIPLINES.map(d => {
                const Icon = d.icon;
                const noteCount = counts ? (counts.notes[d.value] || 0) : null;
                const quizCount = counts ? (counts.quizzes[d.value] || 0) : null;
                const prefix = TOPIC_ROUTE_PREFIX[d.value];
                const shownTopics = d.topics.slice(0, 6);
                return (
                  <div key={d.value} className="flex flex-col rounded-lg border border-border bg-white p-5">
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${d.iconBg}`}>
                        <Icon className={`h-4.5 w-4.5 ${d.iconColor}`} />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold leading-snug text-foreground">{d.label}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {noteCount === null ? "…" : `${noteCount} note${noteCount !== 1 ? "s" : ""}`} · {quizCount === null ? "…" : `${quizCount} MCQ set${quizCount !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{d.description}</p>
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {shownTopics.map(t => (
                        <Link
                          key={t.slug}
                          to={`/${prefix}/${t.slug}`}
                          className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent/60 hover:text-accent"
                        >
                          {t.label}
                        </Link>
                      ))}
                      {d.topics.length > shownTopics.length && (
                        <Link to="/notes" className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-accent hover:underline">
                          +{d.topics.length - shownTopics.length} more
                        </Link>
                      )}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-3 text-xs font-semibold">
                      <Link to="/notes" className="inline-flex items-center gap-1 text-accent hover:underline">
                        <FileText className="h-3.5 w-3.5" /> Notes <ChevronRight className="h-3 w-3" />
                      </Link>
                      <Link to="/quizzes" className="inline-flex items-center gap-1 text-accent hover:underline">
                        <HelpCircle className="h-3.5 w-3.5" /> Practice MCQs <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA strip ────────────────────────────────────────────────── */}
        <section className="border-t border-border bg-slate-50 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Start with your current semester's subject</h2>
              <p className="text-sm text-muted-foreground">Read the notes, then test yourself with the matching MCQ sets.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link to="/notes" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110">
                <BookOpen className="h-4 w-4" /> Browse Notes
              </Link>
              <Link to="/quizzes" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                <HelpCircle className="h-4 w-4" /> Practice MCQs
              </Link>
              <Link to="/lectures" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                <PlayCircle className="h-4 w-4" /> Video Lectures <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MBABBAPage;
