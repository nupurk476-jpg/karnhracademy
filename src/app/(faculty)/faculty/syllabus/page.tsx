import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { SyllabusUnit, Topic } from "@/lib/types";
import { SyllabusManager } from "./syllabus-manager";

export const metadata: Metadata = { title: "Syllabus Management" };
export const dynamic = "force-dynamic";

export default async function SyllabusPage() {
  const supabase = await createClient();

  const [unitsRes, topicsRes, countsRes] = await Promise.all([
    supabase.from("syllabus_units").select("*").order("order_index"),
    supabase.from("topics").select("*").order("order_index"),
    // Aggregated in SQL — fetching raw rows would silently cap at the
    // PostgREST row limit once the bank grows past ~1000 questions.
    supabase.rpc("get_topic_question_counts"),
  ]);

  const counts = new Map<string, number>();
  for (const row of (countsRes.data ?? []) as { topic_id: string; question_count: number }[]) {
    counts.set(row.topic_id, Number(row.question_count));
  }

  return (
    <div className="container max-w-4xl animate-fade-in-up space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Syllabus Management</h1>
        <p className="text-sm text-muted-foreground">
          Units and topics drive AI classification, adaptive practice and analytics. Deactivate
          instead of deleting to keep old questions organized.
        </p>
      </div>
      <SyllabusManager
        units={(unitsRes.data ?? []) as SyllabusUnit[]}
        topics={(topicsRes.data ?? []) as Topic[]}
        questionCounts={Object.fromEntries(counts)}
      />
    </div>
  );
}
