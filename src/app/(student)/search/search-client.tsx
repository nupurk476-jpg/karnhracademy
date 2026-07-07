"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Bookmark, ChevronDown, Search, SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toggleBookmark } from "@/lib/actions/practice";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import type { DifficultyLevel, Question, SyllabusUnit, Topic } from "@/lib/types";

type ResultRow = Pick<
  Question,
  "id" | "stem" | "options" | "difficulty" | "topic_id" | "unit_id" | "keywords"
>;

const RESULT_COLUMNS = "id, stem, options, difficulty, topic_id, unit_id, keywords";

export function SearchClient({
  units,
  topics,
  questionCount,
}: {
  units: SyllabusUnit[];
  topics: Topic[];
  questionCount: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [unitId, setUnitId] = useState("all");
  const [topicId, setTopicId] = useState("all");
  const [difficulty, setDifficulty] = useState<"any" | DifficultyLevel>("any");
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const requestRef = useRef(0);

  const topicTitles = useMemo(
    () => new Map(topics.map((t) => [t.id, t.title])),
    [topics],
  );
  const filteredTopics =
    unitId === "all" ? topics : topics.filter((t) => t.unit_id === unitId);

  useEffect(() => {
    const trimmed = query.trim();
    const requestId = ++requestRef.current;

    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      const withFilters = () => {
        let builder = supabase
          .from("questions")
          .select(RESULT_COLUMNS)
          .eq("status", "published");
        if (unitId !== "all") builder = builder.eq("unit_id", unitId);
        if (topicId !== "all") builder = builder.eq("topic_id", topicId);
        if (difficulty !== "any") builder = builder.eq("difficulty", difficulty);
        return builder;
      };

      let rows: ResultRow[] = [];
      let failed = false;
      const primary = await withFilters()
        .textSearch("search_tsv", trimmed, { type: "websearch" })
        .limit(20);
      if (!primary.error && primary.data) rows = primary.data as ResultRow[];

      // Full-text can miss partial words (or the column may not exist) —
      // fall back to a plain substring match on the stem.
      if (primary.error || rows.length === 0) {
        const fallback = await withFilters().ilike("stem", `%${trimmed}%`).limit(20);
        if (!fallback.error && fallback.data) rows = fallback.data as ResultRow[];
        // Both queries erroring is a connectivity problem, not "no results".
        else if (fallback.error && primary.error) failed = true;
      }

      if (requestRef.current !== requestId) return;
      if (failed) {
        setResults(null);
        setLoading(false);
        toast.error("Search is unavailable right now — check your connection and try again.");
        return;
      }
      setResults(rows);
      setLoading(false);

      // Reflect which of these results the student already bookmarked.
      if (rows.length > 0) {
        const { data: marks } = await supabase
          .from("bookmarks")
          .select("question_id")
          .in("question_id", rows.map((r) => r.id));
        if (requestRef.current !== requestId) return;
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          for (const mark of (marks ?? []) as { question_id: string }[]) {
            next.add(mark.question_id);
          }
          return next;
        });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, unitId, topicId, difficulty, supabase]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onToggleBookmark(id: string) {
    const wasBookmarked = bookmarkedIds.has(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (wasBookmarked) next.delete(id);
      else next.add(id);
      return next;
    });
    const result = await toggleBookmark(id);
    if (!result.ok) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.add(id);
        else next.delete(id);
        return next;
      });
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search input + filters */}
      <div className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search questions…"
            className="h-11 pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search questions"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            value={unitId}
            onValueChange={(value) => {
              setUnitId(value);
              if (
                value !== "all" &&
                !topics.some((t) => t.id === topicId && t.unit_id === value)
              ) {
                setTopicId("all");
              }
            }}
          >
            <SelectTrigger aria-label="Filter by unit">
              <SelectValue placeholder="All units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topicId} onValueChange={setTopicId}>
            <SelectTrigger aria-label="Filter by topic">
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {filteredTopics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={difficulty}
            onValueChange={(value) => setDifficulty(value as "any" | DifficultyLevel)}
          >
            <SelectTrigger aria-label="Filter by difficulty">
              <SelectValue placeholder="Any difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any difficulty</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : results === null ? (
        <EmptyState
          icon={<Search className="size-5" />}
          title={`Search ${questionCount.toLocaleString("en-US")} questions`}
          description="Type a keyword, phrase or concept — results appear as you type."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="No questions found"
          description="Try a different phrase or loosen the filters."
        />
      ) : (
        <ul className="space-y-3">
          {results.map((row) => {
            const expanded = expandedIds.has(row.id);
            const isBookmarked = bookmarkedIds.has(row.id);
            return (
              <li key={row.id} className="rounded-2xl border bg-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => toggleExpanded(row.id)}
                    aria-expanded={expanded}
                  >
                    <p
                      className={cn(
                        "whitespace-pre-wrap text-sm font-medium leading-relaxed",
                        !expanded && "line-clamp-3",
                      )}
                    >
                      {row.stem}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => onToggleBookmark(row.id)}
                      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this question"}
                    >
                      <Bookmark
                        className={cn("size-4", isBookmarked && "fill-primary text-primary")}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => toggleExpanded(row.id)}
                      aria-label={expanded ? "Hide options" : "Show options"}
                      aria-expanded={expanded}
                    >
                      <ChevronDown
                        className={cn("size-4 transition-transform", expanded && "rotate-180")}
                      />
                    </Button>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={row.difficulty} />
                  <span className="text-xs text-muted-foreground">
                    {row.topic_id
                      ? (topicTitles.get(row.topic_id) ?? "Uncategorized")
                      : "Uncategorized"}
                  </span>
                </div>
                {expanded && (
                  <div className="mt-3 animate-fade-in-up">
                    {row.options && row.options.length > 0 ? (
                      <ul className="space-y-1.5">
                        {row.options.map((option) => (
                          <li
                            key={option.key}
                            className="flex gap-2.5 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                          >
                            <span className="shrink-0 font-semibold text-muted-foreground">
                              {option.key}.
                            </span>
                            <span className="whitespace-pre-wrap">{option.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        This question has no answer options to preview.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
