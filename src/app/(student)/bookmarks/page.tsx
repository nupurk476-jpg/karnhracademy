import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Question, Topic } from "@/lib/types";
import { BookmarksList, PracticeBookmarksButton, type BookmarkItem } from "./bookmarks-list";

export const metadata: Metadata = { title: "Bookmarks" };

type BookmarkRow = { created_at: string; questions: Question | null };

export default async function BookmarksPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [bookmarksRes, topicsRes] = await Promise.all([
    supabase
      .from("bookmarks")
      .select("created_at, questions(*)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("topics").select("id, title"),
  ]);

  const topicTitles = new Map(
    ((topicsRes.data ?? []) as Pick<Topic, "id" | "title">[]).map((t) => [t.id, t.title]),
  );

  const items: BookmarkItem[] = ((bookmarksRes.data ?? []) as unknown as BookmarkRow[])
    .filter((row) => row.questions?.status === "published")
    .map((row) => {
      const question = row.questions!;
      return {
        id: question.id,
        stem: question.stem,
        difficulty: question.difficulty,
        topicTitle: question.topic_id
          ? (topicTitles.get(question.topic_id) ?? "Uncategorized")
          : "Uncategorized",
      };
    });

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in-up space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bookmarks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Questions you saved to revisit later.
          </p>
        </div>
        {items.length > 0 && <PracticeBookmarksButton count={items.length} />}
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-5" />}
          title="No bookmarks yet"
          description="Tap the bookmark icon on any question during practice to save it here."
          action={
            <Button asChild>
              <Link href="/practice">Start practicing</Link>
            </Button>
          }
        />
      ) : (
        <BookmarksList items={items} />
      )}
    </div>
  );
}
