import Link from "next/link";
import {
  Sparkles,
  FileUp,
  BrainCircuit,
  Target,
  ShieldCheck,
  LineChart,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: FileUp,
    title: "Ingest any document",
    body: "PDFs, Word files, spreadsheets, even phone-camera scans. Our AI pipeline extracts, OCRs and structures every question — no matter how messy the source.",
  },
  {
    icon: ShieldCheck,
    title: "Faculty-reviewed, always",
    body: "Nothing reaches students unreviewed. Every imported question carries confidence scores and lands in a review queue before it can be published.",
  },
  {
    icon: Target,
    title: "Adaptive practice",
    body: "NETAce learns your weak topics and serves the questions that move your score the most — not the ones you already know.",
  },
  {
    icon: BrainCircuit,
    title: "AI explanations",
    body: "Stuck on a question? Get a clear, tutor-style explanation on demand for any question in the bank.",
  },
  {
    icon: LineChart,
    title: "Real analytics",
    body: "Streaks, topic mastery, accuracy trends. Know exactly where you stand before exam day.",
  },
  {
    icon: Sparkles,
    title: "Mock tests that feel real",
    body: "Timed, exam-style mock tests with a question palette, auto-submit and a detailed per-topic score breakdown.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              N
            </span>
            NETAce AI
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="size-3.5" />
            AI-powered question bank, human-approved
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-6xl">
            Ace your exam with practice that{" "}
            <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
              adapts to you
            </span>
          </h1>
          <p className="max-w-xl text-balance text-base text-muted-foreground md:text-lg">
            NETAce AI turns your institution&apos;s messy question papers into a living,
            searchable, adaptive practice platform — reviewed by faculty, powered by AI.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/register">
                Start practicing free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-card/50">
          <div className="container grid gap-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mb-1.5 font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} NETAce AI</p>
          <p>Built for serious exam preparation.</p>
        </div>
      </footer>
    </div>
  );
}
