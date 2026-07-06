import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { SyllabusUnit, Topic } from "@/lib/types";
import { PracticeSetup } from "./practice-setup";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; unit?: string; topic?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [unitsRes, topicsRes] = await Promise.all([
    supabase
      .from("syllabus_units")
      .select("*")
      .eq("is_active", true)
      .order("order_index"),
    supabase
      .from("topics")
      .select("*")
      .eq("is_active", true)
      .order("order_index"),
  ]);

  const units = (unitsRes.data ?? []) as SyllabusUnit[];
  const topics = (topicsRes.data ?? []) as Topic[];

  const initialTopicId = topics.some((t) => t.id === sp.topic) ? sp.topic! : null;
  const initialUnitId = units.some((u) => u.id === sp.unit)
    ? sp.unit!
    : initialTopicId
      ? (topics.find((t) => t.id === initialTopicId)?.unit_id ?? null)
      : null;
  const initialMode: "adaptive" | "custom" =
    sp.mode === "custom" || initialTopicId || initialUnitId ? "custom" : "adaptive";

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in-up space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sharpen your skills with instant feedback and explanations.
        </p>
      </header>
      <PracticeSetup
        units={units}
        topics={topics}
        initialMode={initialMode}
        initialUnitId={initialUnitId}
        initialTopicId={initialTopicId}
      />
    </div>
  );
}
