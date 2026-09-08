import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ProgrammeRegistration from "@/components/ProgrammeRegistration";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { discountPercent, formatRupees, type Programme } from "@/lib/programmes";
import testimonialData from "@/data/programmeTestimonials.json";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ShoppingCart } from "lucide-react";

interface Testimonial { quote: string; name: string; context: string }

/** Placeholder FAQ — replace the answers before this is used to sell anything. */
const FAQ = [
  {
    q: "Who is this programme for?",
    a: "PLACEHOLDER — describe the student this suits, and be honest about who it does not suit.",
  },
  {
    q: "How are the sessions delivered?",
    a: "PLACEHOLDER — live or recorded, platform, session length, and what happens if someone misses one.",
  },
  {
    q: "What happens after I pay?",
    a: "PLACEHOLDER — confirmation timing, joining details, and who to contact if nothing arrives.",
  },
  {
    q: "Can I get a refund?",
    a: "PLACEHOLDER — summarise the refund policy in a sentence and link to the full page.",
  },
];

const ProgrammeDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { add, has } = useCart();
  const { toast } = useToast();
  const [programme, setProgramme] = useState<Programme | null | "missing">(null);

  useEffect(() => {
    let cancelled = false;
    (supabase.from("programmes" as any) as any)
      .select("*").eq("slug", slug).eq("is_active", true).maybeSingle()
      .then(({ data }: any) => { if (!cancelled) setProgramme(data ?? "missing"); });
    return () => { cancelled = true; };
  }, [slug]);

  if (programme === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" className="mx-auto max-w-3xl px-6 py-20">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (programme === "missing") {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Programme not found" description="This programme is not available." path={`/programmes/${slug}`} />
        <Header />
        <main id="main-content" className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-foreground">Programme not found</h1>
          <p className="mt-3 text-muted-foreground">
            It may have been withdrawn, or the link may be wrong.
          </p>
          <Link to="/programmes" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-deep hover:underline">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All programmes
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const all = testimonialData as unknown as Record<string, Testimonial[]>;
  const testimonials = all[programme.slug] ?? all.default ?? [];
  const off = discountPercent(programme);
  const inCart = has(programme.id);

  const addToCart = () => {
    add({
      programmeId: programme.id,
      slug: programme.slug,
      title: programme.title,
      pricePaise: programme.price_paise,
    });
    toast({
      title: "Added to cart",
      description: "Checkout opens once online payments go live — you can register and pay by UPI below in the meantime.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={programme.title}
        description={programme.short_description || `${programme.title} from Karn HR Academy.`}
        path={`/programmes/${programme.slug}`}
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <Link to="/programmes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All programmes
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          {/* ── What it is ───────────────────────────────────────────── */}
          <div>
            {programme.category && (
              <span className="mb-3 inline-block rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {programme.category}
              </span>
            )}
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{programme.title}</h1>
            {programme.short_description && (
              <p className="mt-2 text-lg text-muted-foreground">{programme.short_description}</p>
            )}
            {programme.long_description && (
              <p className="mt-6 leading-relaxed text-muted-foreground">{programme.long_description}</p>
            )}

            {programme.includes.length > 0 && (
              <>
                <h2 className="mt-10 font-display text-xl font-bold text-foreground">What's included</h2>
                <ul className="mt-4 space-y-2.5">
                  {programme.includes.map(point => (
                    <li key={point} className="flex gap-3 text-sm text-foreground">
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" />
                      {point}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {testimonials.length > 0 && (
              <>
                <h2 className="mt-10 font-display text-xl font-bold text-foreground">What students say</h2>
                <div className="mt-4 space-y-4">
                  {testimonials.map(t => (
                    <blockquote key={t.quote} className="border-l-2 border-accent pl-4">
                      <p className="text-sm italic leading-relaxed text-foreground">"{t.quote}"</p>
                      <footer className="mt-2 text-xs text-muted-foreground">
                        — {t.name}, {t.context}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </>
            )}

            {/* Native <details>: keyboard-operable, screen-reader-announced and
                findable by in-page search with no JavaScript and no new
                dependency — the project has no accordion component, and an FAQ
                does not justify adding one. */}
            <h2 className="mt-10 font-display text-xl font-bold text-foreground">Common questions</h2>
            <div className="mt-3 divide-y divide-border rounded-lg border border-border">
              {FAQ.map(item => (
                <details key={item.q} className="group px-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-sm font-semibold text-foreground marker:content-['']">
                    {item.q}
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* ── Price, cart, and the working UPI path ────────────────── */}
          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-foreground">
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
              {programme.duration_note && (
                <p className="mt-1 text-sm text-muted-foreground">{programme.duration_note}</p>
              )}

              <button
                onClick={addToCart}
                disabled={inCart}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent px-5 py-2.5 text-sm font-semibold text-accent-deep transition hover:bg-accent/10 disabled:opacity-60"
              >
                {inCart ? <><Check aria-hidden="true" className="h-4 w-4" /> In cart</>
                        : <><ShoppingCart aria-hidden="true" className="h-4 w-4" /> Add to cart</>}
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Online checkout is coming. To join now, register and pay by UPI below.
              </p>
            </div>

            <ProgrammeRegistration programme={programme} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProgrammeDetailPage;
