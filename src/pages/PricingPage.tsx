import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { ArrowRight, Check } from "lucide-react";

/**
 * Free versus paid, side by side.
 *
 * The free column is not a crippled teaser — it lists what genuinely stays
 * free and stays complete. The paid column earns its place on what it adds,
 * not on what has been taken away.
 *
 * Copy is static and meant to be edited.
 */
const FREE = [
  "Unit-wise study notes across every discipline",
  "Topic-wise MCQ practice with instant feedback",
  "Previous year question papers by subject and year",
  "Video lectures from HR educators",
  "Read and practise online, no account needed",
];

const PAID = [
  "Everything in Free, unchanged",
  "Watermark-free PDF downloads to keep",
  "Timed test series with score tracking",
  "Live cohort sessions with individual feedback",
  "Progress dashboard and attempt history",
  "Direct access to the faculty for questions",
];

const PricingPage = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Pricing"
      description="What's free and what's paid at Karn HR Academy. All notes, MCQs, previous year papers and lectures stay free; programmes add downloads, test series and live cohorts."
      path="/pricing"
    />
    <Header />
    <main id="main-content" className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold text-foreground">Pricing</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The study material on this site is free and stays free. Programmes add the things
        that take our time — live sessions, marked practice and individual feedback.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Free */}
        <section className="flex flex-col rounded-xl border border-border bg-card p-7">
          <h2 className="font-display text-2xl font-bold text-foreground">Free</h2>
          <p className="mt-1 text-sm text-muted-foreground">Everything you can read and practise online.</p>
          <p className="mt-5 font-display text-3xl font-bold text-foreground">₹0</p>
          <p className="text-xs text-muted-foreground">No account required</p>

          <ul className="mt-6 flex-1 space-y-2.5">
            {FREE.map(item => (
              <li key={item} className="flex gap-3 text-sm text-foreground">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            to="/notes"
            className="mt-7 inline-flex w-fit items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Browse free resources
          </Link>
        </section>

        {/* Paid */}
        <section className="flex flex-col rounded-xl border-2 border-accent bg-card p-7">
          <h2 className="font-display text-2xl font-bold text-foreground">Programmes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Taught, marked and time-bound.</p>
          <p className="mt-5 font-display text-3xl font-bold text-foreground">Per programme</p>
          <p className="text-xs text-muted-foreground">Priced individually — see each one</p>

          <ul className="mt-6 flex-1 space-y-2.5">
            {PAID.map(item => (
              <li key={item} className="flex gap-3 text-sm text-foreground">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            to="/programmes"
            className="mt-7 inline-flex w-fit items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110"
          >
            View programmes <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Programmes provide preparation and support. We do not guarantee admission, selection
        or employment. See the{" "}
        <Link to="/refund-policy" className="font-semibold text-accent-deep hover:underline">
          refund &amp; cancellation policy
        </Link>.
      </p>
    </main>
    <Footer />
  </div>
);

export default PricingPage;
