import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { discountPercent, formatRupees, type Programme } from "@/lib/programmes";
import { ArrowRight } from "lucide-react";

/**
 * The paid catalogue. The free notes, MCQs, PYQs and lectures are untouched
 * and stay where they are — this page is the other half of the freemium
 * split, never a gate in front of the first half.
 */
const ProgrammesPage = () => {
  const [programmes, setProgrammes] = useState<Programme[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (supabase.from("programmes" as any) as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }: any) => { if (!cancelled) setProgrammes(data ?? []); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Programmes"
        description="Paid programmes from Karn HR Academy — GD and PI preparation, communication skills, CV building and UGC NET Code 55 packs for MBA, BBA and Labour Welfare aspirants."
        path="/programmes"
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground">Programmes</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Structured programmes with live sessions, downloadable material and test series.
          The notes, MCQs and previous year papers on this site remain free —{" "}
          <Link to="/pricing" className="font-semibold text-accent-deep hover:underline">
            see what's included in each
          </Link>.
        </p>

        {programmes === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading programmes…</p>
        ) : programmes.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No programmes are open right now. New ones are announced regularly —{" "}
              <Link to="/contact" className="font-semibold text-accent-deep hover:underline">
                get in touch
              </Link>{" "}
              to hear first.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {programmes.map(programme => {
              const off = discountPercent(programme);
              return (
                <article
                  key={programme.id}
                  className="flex flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  {programme.category && (
                    <span className="mb-3 w-fit rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {programme.category}
                    </span>
                  )}
                  <h2 className="font-display text-xl font-bold text-foreground">{programme.title}</h2>
                  {programme.short_description && (
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {programme.short_description}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-2xl font-bold text-foreground">
                      {programme.price_paise > 0 ? formatRupees(programme.price_paise) : "Price on request"}
                    </span>
                    {programme.mrp_paise && programme.mrp_paise > programme.price_paise && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatRupees(programme.mrp_paise)}
                        </span>
                        {off && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent-deep">
                            {off}% off
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <Link
                    to={`/programmes/${programme.slug}`}
                    className="mt-5 inline-flex w-fit items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110"
                  >
                    View details
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
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
