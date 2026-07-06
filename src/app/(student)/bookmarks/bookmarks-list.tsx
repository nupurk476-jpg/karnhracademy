"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookmarkX, Dumbbell } from "lucide-react";
import { startSession, toggleBookmark } from "@/lib/actions/practice";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DifficultyBadge } from "@/components/shared/badges";
import type { DifficultyLevel } from "@/lib/types";

export interface BookmarkItem {
  id: string;
  stem: string;
  difficulty: DifficultyLevel | null;
  topicTitle: string;
}

export function PracticeBookmarksButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onStart() {
    startTransition(async () => {
      const result = await startSession({
        kind: "bookmarks",
        count: Math.min(count, 50),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/practice/session/${result.data.sessionId}`);
    });
  }

  return (
    <Button onClick={onStart} disabled={pending} className="shrink-0">
      {pending ? <Spinner className="size-4" /> : <Dumbbell className="size-4" />}
      Practice bookmarks ({Math.min(count, 50)})
    </Button>
  );
}

export function BookmarksList({ items }: { items: BookmarkItem[] }) {
  const router = useRouter();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function onRemove(id: string) {
    setRemovingId(id);
    setRemovedIds((prev) => new Set(prev).add(id));
    const result = await toggleBookmark(id);
    setRemovingId(null);
    if (!result.ok) {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  const visible = items.filter((item) => !removedIds.has(item.id));

  if (visible.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        All bookmarks removed.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {visible.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-3 rounded-2xl border bg-card p-4 sm:p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 whitespace-pre-wrap text-sm font-medium leading-relaxed">
              {item.stem}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={item.difficulty} />
              <span className="text-xs text-muted-foreground">{item.topicTitle}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
            disabled={removingId === item.id}
            aria-label="Remove bookmark"
          >
            {removingId === item.id ? (
              <Spinner className="size-4" />
            ) : (
              <BookmarkX className="size-4" />
            )}
          </Button>
        </li>
      ))}
    </ul>
  );
}
