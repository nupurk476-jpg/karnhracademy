import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Question, QuestionStatus, SyllabusUnit, Topic } from "@/lib/types";
import { ReviewFilters } from "./review-filters";
import { ReviewList } from "./review-list";

export const metadata: Metadata = { title: "Review Queue" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const VALID_STATUSES: QuestionStatus[] = [
  "pending_review",
  "approved",
  "published",
  "rejected",
  "archived",
  "duplicate",
];

export type ReviewRow = Pick<
  Question,
  | "id"
  | "status"
  | "question_type"
  | "stem"
  | "options"
  | "correct_options"
  | "answer_text"
  | "explanation"
  | "explanation_is_ai"
  | "unit_id"
  | "topic_id"
  | "difficulty"
  | "overall_confidence"
  | "import_warnings"
  | "created_at"
>;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const status = (
    VALID_STATUSES.includes(params.status as QuestionStatus)
      ? params.status
      : "pending_review"
  ) as QuestionStatus;
  const unitId = typeof params.unit === "string" ? params.unit : undefined;
  const missing = typeof params.missing === "string" ? params.missing : undefined;
  const confidence = typeof params.confidence === "string" ? params.confidence : undefined;
  const jobId = typeof params.job === "string" ? params.job : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : undefined;
  const page = Math.max(1, parseInt((params.page as string) ?? "1", 10) || 1);

  let query = supabase
    .from("questions")
    .select(
      "id, status, question_type, stem, options, correct_options, answer_text, explanation, explanation_is_ai, unit_id, topic_id, difficulty, overall_confidence, import_warnings, created_at",
      { count: "exact" },
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (unitId) query = query.eq("unit_id", unitId);
  if (jobId) query = query.eq("ingestion_job_id", jobId);
  if (missing === "answer") query = query.is("correct_options", null).is("answer_text", null);
  if (missing === "explanation") query = query.is("explanation", null);
  if (missing === "topic") query = query.is("topic_id", null);
  if (confidence === "low") query = query.or("overall_confidence.lt.0.6,overall_confidence.is.null");
  if (q) query = query.ilike("stem", `%${q}%`);

  const [{ data: questions, count }, unitsRes, topicsRes] = await Promise.all([
    query,
    supabase.from("syllabus_units").select("*").order("order_index"),
    supabase.from("topics").select("*").order("order_index"),
  ]);

  const units = (unitsRes.data ?? []) as SyllabusUnit[];
  const topics = (topicsRes.data ?? []) as Topic[];

  return (
    <div className="container max-w-5xl animate-fade-in-up space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          Verify AI-imported questions before they reach students. Low-confidence and
          incomplete items are flagged for you.
        </p>
      </div>

      <ReviewFilters units={units} totalCount={count ?? 0} />

      <ReviewList
        questions={(questions ?? []) as ReviewRow[]}
        units={units}
        topics={topics}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={count ?? 0}
        status={status}
      />
    </div>
  );
}
