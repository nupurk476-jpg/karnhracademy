import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDateRange, formatRupees, isCohortOpen,
  type Cohort, type Programme,
} from "@/lib/programmes";
import { ArrowRight, CalendarDays } from "lucide-react";

/**
 * The paid side of the site. Free notes, MCQs and PYQs stay exactly where
 * they are — this lists only the programmes that run to a calendar and
 * cost money, so the two never blur into each other.
 */
const ProgrammesPage = () => {
  const [programmes, setProgrammes] = useState<Programme[] | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: progs } = await (supabase.from("programmes" as any) as any)
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true });
      if (cancelled) return;
      const list: Programme[] = progs ?? [];
      setProgrammes(list);

      if (list.length === 0) return;
      const { data: batches } = await (supabase.from("programme_cohorts" as any) as any)
        .select("*")
        .in("programme_id", list.map(p => p.id))
        .order("starts_on", { ascending: true });
      if (!cancelled) setCohorts(batches ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const nextOpenCohort = (programmeId: string) =>
    cohorts.find(c => c.programme_id === programmeId && isCohortOpen(c));

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Programmes"
        description="Structured, fixed-batch programmes from Karn HR Academy — GD and PI preparation, communication skills, and interview coaching for MBA, BBA and HR careers."
        path="/programmes"
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground">Programmes</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Small, dated batches with limited seats, so everyone gets speaking time and
          individual feedback. The notes, MCQs and previous year papers on this site stay
          free — these are the sessions we run with you.
        </p>

        {programmes === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading programmes…</p>
        ) : programmes.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No programmes are open for registration right now. New batches are announced
              regularly — check back soon, or{" "}
              <Link to="/contact" className="font-semibold text-accent-deep hover:underline">
                get in touch
              </Link>{" "}
              to be told when the next one opens.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-5">
            {programmes.map(programme => {
              const next = nextOpenCohort(programme.id);
              return (
                <article
                  key={programme.id}
                  className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md sm:p-8"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        {programme.title}
                      </h2>
                      {programme.subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground">{programme.subtitle}</p>
                      )}

                      {next ? (
                        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-deep">
                          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                          Next batch {formatDateRange(next.starts_on, next.ends_on)}
                        </p>
                      ) : (
                        <p className="mt-4 text-xs font-medium text-muted-foreground">
                          Dates for the next batch are being finalised.
                        </p>
                      )}

                      {programme.highlights.length > 0 && (
                        <ul className="mt-4 space-y-1.5">
                          {programme.highlights.slice(0, 3).map(point => (
                            <li key={point} className="flex gap-2 text-sm text-muted-foreground">
                              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="shrink-0 sm:text-right">
                      {programme.price_paise > 0 && (
                        <p className="font-display text-2xl font-bold text-foreground">
                          {formatRupees(programme.price_paise)}
                        </p>
                      )}
                      <Link
                        to={`/programmes/${programme.slug}`}
                        className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110"
                      >
                        {next ? "View & register" : "View details"}
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProgrammesPage;
