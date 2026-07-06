"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { IngestionEvent } from "@/lib/types";

/** Per-job pipeline log, loaded on demand into a slide-over. */
export function ImportEvents({ jobId, fileName }: { jobId: string; fileName: string }) {
  const [events, setEvents] = useState<IngestionEvent[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (events || loading) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("ingestion_events")
      .select("*")
      .eq("job_id", jobId)
      .order("id", { ascending: true })
      .limit(200);
    setEvents((data as IngestionEvent[]) ?? []);
    setLoading(false);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void load()}>
          <ScrollText className="size-3.5" /> Log
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="truncate pr-6">{fileName}</SheetTitle>
          <SheetDescription>Pipeline events for this import.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 max-h-[calc(100dvh-8rem)] space-y-2.5 overflow-y-auto pr-1">
          {loading && (
            <div className="flex justify-center py-8">
              <Spinner className="size-5" />
            </div>
          )}
          {events?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No events recorded.</p>
          )}
          {events?.map((event) => (
            <div key={event.id} className="flex gap-2.5 text-sm">
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  event.level === "error" && "bg-destructive",
                  event.level === "warn" && "bg-warning",
                  (event.level === "info" || event.level === "debug") && "bg-primary/60",
                )}
              />
              <div className="min-w-0">
                <p className="leading-snug">{event.message}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(event.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
