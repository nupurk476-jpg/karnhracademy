import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, FileText, Presentation, HelpCircle, ScrollText, ClipboardList,
  Bookmark, BookmarkCheck, Layers, Clock,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  HST_CATEGORIES, HST_FREQUENCIES, HIGH_SCORING_TOPICS, FREQUENCY_LABEL, PYQ_FREQUENCY_LABEL,
  getUnitsForTopic, unitsLabel, type HighScoringTopic, type HSTFrequency,
} from "@/lib/highScoringTopics";
import { resolveLWTopicSlug } from "@/lib/labourWelfareUnits";
import { useBookmarks } from "@/hooks/use-bookmarks";

// A three-step emphasis ramp, not three brand hues: vermillion carries the
// "appears most often" badge, and the lower two step down through warm
// neutral to grey so the eye lands on "high" first.
const FREQUENCY_STYLE: Record<HSTFrequency, string> = {
  high: "bg-[#FDEEEA] text-[#8C2A1E] border-[#F3C7B4]",
  medium: "bg-[#F2F1EF] text-[#6E6963] border-[#DCD9D3]",
  low: "bg-slate-100 text-slate-500 border-slate-200",
};

// PPT and Case Study have no dedicated content type in the database yet —
// their icons render muted/"coming soon" rather than faking availability.
const RESOURCE_TYPES = [
  { key: "pdf", label: "Notes", icon: FileText },
  { key: "ppt", label: "PPT Slides", icon: Presentation },
  { key: "mcq", label: "MCQs", icon: HelpCircle },
  { key: "pyq", label: "Previous Year Questions", icon: ScrollText },
  { key: "caseStudy", label: "Case Study", icon: ClipboardList },
] as const;

type ResourceKey = (typeof RESOURCE_TYPES)[number]["key"];

type Props = {
  notes?: any[];
  quizzes?: any[];
  pyqs?: any[];
  lectures?: any[];
};

const HighScoringTopicsSection = ({ notes = [], quizzes = [], pyqs = [], lectures = [] }: Props) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | HighScoringTopic["category"]>("all");
  const [frequency, setFrequency] = useState<"all" | HSTFrequency>("all");
  const { isBookmarked, toggle } = useBookmarks();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return HIGH_SCORING_TOPICS.filter(t => {
      if (category !== "all" && t.category !== category) return false;
      if (frequency !== "all" && t.frequency !== frequency) return false;
      if (!term) return true;
      return t.name.toLowerCase().includes(term) || unitsLabel(t).toLowerCase().includes(term);
    });
  }, [search, category, frequency]);

  return (
    <section className="border-b border-border bg-white py-10" id="high-scoring-topics">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-1 flex items-center gap-2">
          <Layers className="h-5 w-5 text-accent-deep" />
          <h2 className="text-xl font-bold text-foreground">High-Scoring Topics</h2>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          The most frequently asked UGC NET Code 55 topics, organised by exam weight — jump straight to
          the notes, MCQs and previous year questions that matter most.
        </p>

        <div className="mb-3 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search high-scoring topics… (try “Maslow”)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-slate-50 py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 sm:max-w-sm"
          />
        </div>

        <div className="mb-2 flex flex-wrap gap-2">
          {HST_CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              aria-pressed={category === c.value}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                category === c.value
                  ? "bg-accent text-accent-foreground"
                  : "border border-border bg-white text-muted-foreground hover:bg-slate-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {HST_FREQUENCIES.map(f => (
            <button
              key={f.value}
              onClick={() => setFrequency(f.value)}
              aria-pressed={frequency === f.value}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                frequency === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-slate-50 text-muted-foreground hover:bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
            <p className="text-sm text-muted-foreground">No topics match your search.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">{filtered.length} topic{filtered.length !== 1 ? "s" : ""}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(topic => (
                <TopicCard
                  key={topic.slug}
                  topic={topic}
                  notes={notes}
                  quizzes={quizzes}
                  pyqs={pyqs}
                  lectures={lectures}
                  bookmarked={isBookmarked(topic.slug)}
                  onToggleBookmark={() => toggle(topic.slug)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const TopicCard = ({
  topic, notes, quizzes, pyqs, lectures, bookmarked, onToggleBookmark,
}: {
  topic: HighScoringTopic;
  notes: any[];
  quizzes: any[];
  pyqs: any[];
  lectures: any[];
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) => {
  const units = getUnitsForTopic(topic);
  const unitNumbers = useMemo(() => new Set(units.map(u => u.number)), [units]);

  const topicNotes = notes.filter(n => topic.topicSlugs.includes(resolveLWTopicSlug(n.topic_slug)));
  const topicQuizzes = quizzes.filter(q => topic.topicSlugs.includes(resolveLWTopicSlug(q.topic_slug)));
  // PYQs aren't topic-tagged in the schema, only unit-tagged — count is a
  // unit-level match, the closest available granularity.
  const topicPyqs = pyqs.filter(p => (p.unit_tags ?? []).some((n: number) => unitNumbers.has(n)));
  void lectures; // reserved for a future "related lectures" count once volume justifies it here

  const available: Record<ResourceKey, boolean> = {
    pdf: topicNotes.length > 0,
    ppt: false,
    mcq: topicQuizzes.length > 0,
    pyq: topicPyqs.length > 0,
    caseStudy: false,
  };
  const readyCount = Object.values(available).filter(Boolean).length;
  const progressPct = Math.round((readyCount / RESOURCE_TYPES.length) * 100);

  return (
    <div className="group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <Link
        to={`/ugc-net-labour-welfare/topic/${topic.slug}`}
        aria-label={`${topic.name} — open topic page`}
        className="absolute inset-0 rounded-lg"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${FREQUENCY_STYLE[topic.frequency]}`}>
            {FREQUENCY_LABEL[topic.frequency]}
          </span>
        </div>
        <button
          onClick={onToggleBookmark}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark this topic"}
          aria-pressed={bookmarked}
          className={`relative z-10 shrink-0 rounded-md p-1.5 transition-colors ${bookmarked ? "text-accent-deep" : "text-muted-foreground/50 hover:text-accent-deep"}`}
        >
          {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </div>

      <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-accent-deep">{topic.name}</h3>

      <p className="text-[11px] font-medium text-muted-foreground/80">{PYQ_FREQUENCY_LABEL[topic.frequency]}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>{units.length > 0 ? unitsLabel(topic) : "Unit not mapped"}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {topic.readTimeMinutes} min read</span>
        {topicPyqs.length > 0 && <span>{topicPyqs.length} PYQ{topicPyqs.length !== 1 ? "s" : ""}</span>}
      </div>

      <div className="relative z-10 flex items-center gap-1.5">
        {RESOURCE_TYPES.map(r => (
          <Tooltip key={r.key}>
            <TooltipTrigger asChild>
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${
                  available[r.key] ? "border-accent/40 bg-accent/10 text-accent-deep" : "border-border bg-muted/40 text-muted-foreground/30"
                }`}
              >
                <r.icon className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{r.label}{!available[r.key] && " — coming soon"}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Resources ready</span>
          <span>{readyCount} of {RESOURCE_TYPES.length}</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>
    </div>
  );
};

export default HighScoringTopicsSection;
