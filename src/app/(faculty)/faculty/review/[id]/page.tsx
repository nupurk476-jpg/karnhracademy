import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Question, QuestionRevision, SyllabusUnit, Topic } from "@/lib/types";
import { QuestionEditor } from "./question-editor";

export const metadata: Metadata = { title: "Question editor" };
export const dynamic = "force-dynamic";

export interface DuplicateInfo {
  pairId: string;
  otherId: string;
  otherStem: string;
  otherStatus: string;
  similarity: number;
  method: string;
}

export interface RevisionInfo extends QuestionRevision {
  actorName: string | null;
}

export default async function QuestionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: question } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single<Question>();
  if (!question) notFound();

  const [unitsRes, topicsRes, docRes, dupesRes, revisionsRes] = await Promise.all([
    supabase.from("syllabus_units").select("*").order("order_index"),
    supabase.from("topics").select("*").order("order_index"),
    question.document_id
      ? supabase
          .from("documents")
          .select("file_name, page_count, needs_ocr")
          .eq("id", question.document_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("question_duplicates")
      .select("id, question_id, duplicate_id, similarity, method, status")
      .or(`question_id.eq.${id},duplicate_id.eq.${id}`)
      .eq("status", "open"),
    supabase
      .from("question_revisions")
      .select("*, profiles:actor_id(full_name)")
      .eq("question_id", id)
      .order("id", { ascending: false })
      .limit(15),
  ]);

  // Resolve counterpart stems for duplicate pairs.
  const dupePairs = dupesRes.data ?? [];
  const otherIds = dupePairs.map((d) =>
    d.question_id === id ? d.duplicate_id : d.question_id,
  );
  let duplicates: DuplicateInfo[] = [];
  if (otherIds.length > 0) {
    const { data: others } = await supabase
      .from("questions")
      .select("id, stem, status")
      .in("id", otherIds);
    const byId = new Map((others ?? []).map((o) => [o.id, o]));
    duplicates = dupePairs
      .map((d) => {
        const otherId = d.question_id === id ? d.duplicate_id : d.question_id;
        const other = byId.get(otherId);
        if (!other) return null;
        return {
          pairId: d.id,
          otherId,
          otherStem: other.stem,
          otherStatus: other.status,
          similarity: Number(d.similarity),
          method: d.method,
        };
      })
      .filter((d): d is DuplicateInfo => d !== null);
  }

  const revisions: RevisionInfo[] = (revisionsRes.data ?? []).map((r) => ({
    ...(r as QuestionRevision),
    actorName:
      (r as { profiles?: { full_name: string | null } | null }).profiles?.full_name ?? null,
  }));

  return (
    <QuestionEditor
      question={question}
      units={(unitsRes.data ?? []) as SyllabusUnit[]}
      topics={(topicsRes.data ?? []) as Topic[]}
      document={docRes.data as { file_name: string; page_count: number | null; needs_ocr: boolean } | null}
      duplicates={duplicates}
      revisions={revisions}
    />
  );
}
