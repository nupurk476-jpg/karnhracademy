import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { SyllabusUnit, Topic } from "@/lib/types";
import { SearchClient } from "./search-client";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage() {
  const supabase = await createClient();

  const [unitsRes, topicsRes, countRes] = await Promise.all([
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
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  const units = (unitsRes.data ?? []) as SyllabusUnit[];
  const topics = (topicsRes.data ?? []) as Topic[];
  const questionCount = countRes.count ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in-up space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find any question in the bank by keyword, topic or difficulty.
        </p>
      </header>
      <SearchClient units={units} topics={topics} questionCount={questionCount} />
    </div>
  );
}
