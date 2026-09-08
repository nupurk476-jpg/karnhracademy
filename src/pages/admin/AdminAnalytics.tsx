import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pct } from "@/lib/analyticsFormat";
import { BarChart3, TrendingDown, Search, Users } from "lucide-react";

/**
 * What the funnel events add up to.
 *
 * Deliberately reports *rates*, not just counts. A raw tally of
 * reg_payment says nothing on its own; "38% of people who reached the
 * payment step never came back with a reference" is a decision. Every
 * number here is one round trip to analytics_summary(), which does the
 * aggregation in SQL — see the migration for why.
 */

type Summary = {
  days: number;
  visitors: number;
  totals: Record<string, number>;
  zero_result_searches: { q: string; n: number }[];
  top_searches: { q: string; n: number }[];
  top_content: { path: string; n: number }[];
  signup_sources: { from: string; n: number }[];
  programme_funnel: {
    slug: string; views: number; details: number; payment: number; submitted: number;
  }[];
  daily: { day: string; n: number }[];
};

const RANGES = [7, 30, 90] as const;

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const Section = ({
  title, icon: Icon, blurb, children,
}: {
  title: string; icon: typeof BarChart3; blurb: string; children: React.ReactNode;
}) => (
  <section className="mb-8">
    <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-foreground">
      <Icon className="h-4 w-4 text-accent-deep" /> {title}
    </h2>
    <p className="mb-3 text-sm text-muted-foreground">{blurb}</p>
    {children}
  </section>
);

/** One funnel step, with the drop from the previous one made explicit. */
const FunnelRow = ({
  label, count, prev, note,
}: { label: string; count: number; prev?: number; note?: string }) => (
  <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
    <div>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
    <div className="flex items-center gap-4 text-right">
      <span className="text-sm font-semibold text-foreground">{count}</span>
      {prev !== undefined && (
        <span className={`w-16 text-xs font-medium ${count < prev ? "text-destructive" : "text-muted-foreground"}`}>
          {pct(count, prev)}
        </span>
      )}
    </div>
  </div>
);

const AdminAnalytics = () => {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (supabase.rpc as any)("analytics_summary", { _days: days }).then(({ data: d, error }: any) => {
      if (cancelled) return;
      setLoading(false);
      if (error) {
        toast({ title: "Couldn't load analytics", description: error.message, variant: "destructive" });
        return;
      }
      setData(d as Summary);
    });
    return () => { cancelled = true; };
  }, [days, toast]);

  const t = data?.totals ?? {};
  const n = (key: string) => t[key] ?? 0;

  const totalEvents = Object.values(t).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <div className="flex gap-1 rounded-md border border-border p-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                days === r ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Funnel events from the site. Pageviews and traffic sources live in Vercel Web Analytics —
        this screen answers what people <em>did</em>, not how many arrived.
      </p>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && data && totalEvents === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="font-medium text-foreground">No events in the last {data.days} days</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Events appear as visitors use the site. Give it a few days before reading anything into these numbers.
          </p>
        </div>
      )}

      {!loading && data && totalEvents > 0 && (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Visitors" value={data.visitors} hint={`distinct browsers, ${data.days}d`} />
            <Stat label="Events" value={totalEvents} />
            <Stat label="Quizzes completed" value={n("quiz_complete")} />
            <Stat label="Registrations" value={n("reg_submitted")} hint="submitted with a UPI reference" />
          </div>

          <Section
            title="Registration funnel"
            icon={TrendingDown}
            blurb="Each percentage is of the step above it. The gap between “tried to pay” and “submitted” is money that left: they paid, then never came back to enter the reference."
          >
            <div className="rounded-lg border border-border bg-card px-4">
              <FunnelRow label="Viewed a programme" count={n("programme_view")} />
              <FunnelRow label="Completed their details" count={n("reg_details")} prev={n("programme_view")} />
              <FunnelRow
                label="Tried to pay"
                count={n("reg_payment")}
                prev={n("reg_details")}
                note="copied the UPI ID or opened a UPI app"
              />
              <FunnelRow
                label="Submitted a reference"
                count={n("reg_submitted")}
                prev={n("reg_payment")}
                note="the row you verify by hand in Registrations"
              />
            </div>

            {data.programme_funnel.length > 1 && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Programme</th>
                      <th className="px-3 py-2 text-right font-medium">Views</th>
                      <th className="px-3 py-2 text-right font-medium">Details</th>
                      <th className="px-3 py-2 text-right font-medium">Tried to pay</th>
                      <th className="px-3 py-2 text-right font-medium">Submitted</th>
                      <th className="px-3 py-2 text-right font-medium">View→Reg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.programme_funnel.map(p => (
                      <tr key={p.slug} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground">{p.slug}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{p.views}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{p.details}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{p.payment}</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{p.submitted}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{pct(p.submitted, p.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section
            title="Gates"
            icon={Users}
            blurb="What the two things standing between a visitor and the material actually cost. A sign-in wall that turns away far more people than it converts is buying leads at a price worth knowing."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card px-4">
                <FunnelRow label="Hit the quiz sign-in wall" count={n("quiz_signin_required")} />
                <FunnelRow label="Started a quiz" count={n("quiz_start")} />
                <FunnelRow label="Finished a quiz" count={n("quiz_complete")} prev={n("quiz_start")} />
                <FunnelRow
                  label="Signed up"
                  count={n("auth_signup")}
                  prev={n("quiz_signin_required")}
                  note="all signups vs. people the quiz wall turned away"
                />
              </div>
              <div className="rounded-lg border border-border bg-card px-4">
                <FunnelRow label="Download email gate shown" count={n("gate_shown")} />
                <FunnelRow label="Gave an email" count={n("gate_submitted")} prev={n("gate_shown")} />
                <FunnelRow label="Walked away" count={n("gate_dismissed")} prev={n("gate_shown")} />
                <FunnelRow label="Newsletter sign-ups" count={n("newsletter_subscribe")} />
              </div>
            </div>
          </Section>

          <Section
            title="What people looked for and didn't find"
            icon={Search}
            blurb="Your content backlog, written by the students themselves. Every row is someone who wanted something you don't have yet."
          >
            {data.zero_result_searches.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No empty-handed searches in this period.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Search term</th>
                      <th className="px-3 py-2 text-right font-medium">Times</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.zero_result_searches.map(s => (
                      <tr key={s.q} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{s.q}</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{s.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section
            title="Most opened material"
            icon={BarChart3}
            blurb="Where notes and papers are actually opened from — the pages carrying the load."
          >
            {data.top_content.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nothing opened yet in this period.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Page</th>
                      <th className="px-3 py-2 text-right font-medium">Opens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_content.map(c => (
                      <tr key={c.path} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{c.path}</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{c.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
};

export default AdminAnalytics;
