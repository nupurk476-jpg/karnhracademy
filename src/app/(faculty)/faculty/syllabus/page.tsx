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
    supabase
      .from("questions")
      .select("topic_id")
      .not("topic_id", "is", null)
      .not("status", "in", '("rejected","duplicate")'),
  ]);

  const counts = new Map<string, number>();
  for (const row of countsRes.data ?? []) {
    if (row.topic_id) counts.set(row.topic_id, (counts.get(row.topic_id) ?? 0) + 1);
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
