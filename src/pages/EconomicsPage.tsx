import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContentLoadError from "@/components/ContentLoadError";
import SubjectCard from "@/components/SubjectCard";
import { useSubjectCounts } from "@/hooks/use-subject-counts";
import { DISCIPLINES } from "@/lib/disciplines";
import { ECONOMICS_VALUES } from "@/lib/economicsTracks";
import { FileText, HelpCircle, PlayCircle, Layers } from "lucide-react";

const ECONOMICS_DISCIPLINES = ECONOMICS_VALUES
  .map(v => DISCIPLINES.find(d => d.value === v))
  .filter((d): d is typeof DISCIPLINES[number] => !!d);

// One entry point for every economics track: Micro Economics (BA / B.Com),
// Managerial Economics (MBA) and Business Economics (BBA). Each tile links to
// that track's own hub, so this page only routes students to the right depth.
const EconomicsPage = () => {
  const { counts, failed } = useSubjectCounts();
  const total = (kind: "notes" | "quizzes" | "lectures") =>
    counts ? ECONOMICS_VALUES.reduce((sum, v) => sum + (counts[kind][v] || 0), 0) : null;
  const n = (v: number | null) => (v !== null ? v : "…");

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Economics Notes for BA, B.Com, BBA & MBA — Micro, Managerial & Business Economics"
        description="Free economics study hub for BA, B.Com, BBA and MBA students, teachers and professionals — Micro Economics, Managerial Economics and Business Economics notes, MCQ practice sets and video lectures, organised unit-wise."
        path="/economics"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Economics Study Hub",
          description: "Free notes, MCQ practice and video lectures for Micro Economics, Managerial Economics (MBA) and Business Economics (BBA).",
          provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: "https://karnhracademy.com" },
          isAccessibleForFree: true,
          inLanguage: "en",
        }}
      />
      <Header />

      <main id="main-content">
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <Breadcrumbs items={[
              { label: "Home", to: "/" },
              { label: "Economics" },
            ]} />

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-deep">BA · B.Com · BBA · MBA · Professionals</p>
            <h1 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Economics Hub
            </h1>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Micro, Managerial and Business Economics explained topic by topic, with diagrams, solved examples
              and exam-ready notes. Pick your track below. Everything is free.
            </p>

            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { icon: Layers, v: ECONOMICS_DISCIPLINES.length, l: "Tracks" },
                { icon: FileText, v: n(total("notes")), l: "Notes" },
                { icon: HelpCircle, v: n(total("quizzes")), l: "MCQ Sets" },
                { icon: PlayCircle, v: n(total("lectures")), l: "Video Lectures" },
              ].map(c => {
                const I = c.icon;
                return (
                  <span key={c.l} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5">
                    <I className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{c.v}</strong>&nbsp;{c.l}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {failed && (
          <div className="mx-auto max-w-6xl px-6 pt-6">
            <ContentLoadError what="economics material" compact />
          </div>
        )}

        <section className="py-10" aria-labelledby="tracks-heading">
          <div className="mx-auto max-w-6xl px-6">
            <h2 id="tracks-heading" className="mb-4 text-lg font-bold text-foreground">Choose your track</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ECONOMICS_DISCIPLINES.map(d => (
                <SubjectCard
                  key={d.value}
                  discipline={d}
                  notes={counts ? (counts.notes[d.value] || 0) : null}
                  quizzes={counts ? (counts.quizzes[d.value] || 0) : null}
                  lectures={counts ? (counts.lectures[d.value] || 0) : null}
                  minNotes={0}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default EconomicsPage;
