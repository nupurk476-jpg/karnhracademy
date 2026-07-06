import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/types";
import { DuplicateManager } from "./duplicate-manager";

export const metadata: Metadata = { title: "Duplicate Manager" };
export const dynamic = "force-dynamic";

export type DupeQuestion = Pick<
  Question,
  "id" | "stem" | "options" | "correct_options" | "explanation" | "status" | "created_at" | "topic_id"
>;

export interface DupePair {
  id: string;
  similarity: number;
  method: string;
  created_at: string;
  a: DupeQuestion;
  b: DupeQuestion;
}

export default async function DuplicatesPage() {
  const supabase = await createClient();

  const { data: pairs } = await supabase
    .from("question_duplicates")
    .select("id, question_id, duplicate_id, similarity, method, created_at")
    .eq("status", "open")
    .order("similarity", { ascending: false })
    .limit(50);

  const ids = [...new Set((pairs ?? []).flatMap((p) => [p.question_id, p.duplicate_id]))];
  const { data: questions } = ids.length
    ? await supabase
        .from("questions")
        .select("id, stem, options, correct_options, explanation, status, created_at, topic_id")
        .in("id", ids)
    : { data: [] };

  const byId = new Map(((questions ?? []) as DupeQuestion[]).map((q) => [q.id, q]));

  const resolved: DupePair[] = (pairs ?? [])
    .map((p) => {
      const a = byId.get(p.question_id);
      const b = byId.get(p.duplicate_id);
      if (!a || !b) return null;
      return {
        id: p.id,
        similarity: Number(p.similarity),
        method: p.method,
        created_at: p.created_at,
        a,
        b,
      };
    })
    .filter((p): p is DupePair => p !== null);

  return (
    <div className="container max-w-4xl animate-fade-in-up space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Duplicate Manager</h1>
        <p className="text-sm text-muted-foreground">
          The pipeline flags near-identical questions using exact, fuzzy and semantic matching.
          Merging keeps the older question and fills its gaps from the newer one.
        </p>
      </div>
      <DuplicateManager pairs={resolved} />
    </div>
  );
}
