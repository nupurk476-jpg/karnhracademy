"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ScanText,
  Split,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ListChecks,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import type { JobStatus } from "@/lib/types";
import type { JobWithDocument } from "./page";

const ACTIVE: JobStatus[] = ["pending", "extracting", "parsing", "enriching"];

const STAGE_META: Record<JobStatus, { label: string; icon: React.ElementType }> = {
  pending: { label: "Queued", icon: Clock },
  extracting: { label: "Extracting text / OCR", icon: ScanText },
  parsing: { label: "Splitting questions", icon: Split },
  enriching: { label: "AI enrichment", icon: Sparkles },
  completed: { label: "Complete", icon: CheckCircle2 },
  failed: { label: "Failed", icon: XCircle },
  cancelled: { label: "Cancelled", icon: XCircle },
};

interface TickResponse {
  status: JobStatus;
  progress: number;
  detail: string | null;
  done: boolean;
  error?: string;
}

/**
 * Drives the pipeline: for every active job, repeatedly calls the process
 * endpoint (one bounded stage per call) and renders live progress. Resilient
 * to tab refreshes — jobs resume from their persisted cursor.
 */
export function ProcessingList({ initialJobs }: { initialJobs: JobWithDocument[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const driving = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const patchJob = useCallback((id: string, patch: Partial<JobWithDocument>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const driveJob = useCallback(
    async (jobId: string) => {
      if (driving.current.has(jobId)) return;
      driving.current.add(jobId);

      let consecutiveErrors = 0;
      try {
        // Each iteration advances one pipeline stage server-side.
        for (let i = 0; i < 400 && mounted.current; i++) {
          let tick: TickResponse;
          try {
            const res = await fetch(`/api/ingestion/jobs/${jobId}/process`, { method: "POST" });
            tick = (await res.json()) as TickResponse;
            if (!res.ok) throw new Error(tick.error ?? "Processing failed");
            consecutiveErrors = 0;
          } catch (err) {
            consecutiveErrors++;
            if (consecutiveErrors >= 4) {
              toast.error(err instanceof Error ? err.message : "Processing stalled — retry from the job card.");
              break;
            }
            await sleep(2500 * consecutiveErrors);
            continue;
          }

          patchJob(jobId, {
            status: tick.status,
            progress: tick.progress,
            stage_detail: tick.detail,
          });

          if (tick.done) {
            if (tick.status === "completed") {
              toast.success("Import complete — questions are in the Review Queue.");
            }
            break;
          }
          await sleep(600);
        }
      } finally {
        driving.current.delete(jobId);
      }
    },
    [patchJob],
  );

  useEffect(() => {
    for (const job of jobs) {
      if (ACTIVE.includes(job.status)) void driveJob(job.id);
    }
    // Deliberately keyed on ids only: start drivers for jobs, not every patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.map((j) => j.id).join(","), driveJob]);

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title="Nothing processing"
        description="Upload documents and they'll appear here with live AI processing progress."
        action={
          <Button asChild size="sm">
            <Link href="/faculty/upload">Go to Upload Center</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        const meta = STAGE_META[job.status];
        const isActive = ACTIVE.includes(job.status);
        return (
          <div key={job.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  job.status === "completed" && "bg-success/15 text-success",
                  job.status === "failed" && "bg-destructive/10 text-destructive",
                  isActive && "bg-accent text-accent-foreground",
                  job.status === "cancelled" && "bg-muted text-muted-foreground",
                )}
              >
                {isActive ? <Spinner className="size-4" /> : <meta.icon className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-sm font-medium">
                    {job.documents?.file_name ?? "Document"}
                  </p>
                  {job.documents?.needs_ocr && (
                    <Badge variant="secondary" className="text-[10px]">
                      OCR
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {meta.label}
                  {job.stage_detail ? ` — ${job.stage_detail}` : ""}
                  {job.status === "failed" && job.error ? ` — ${job.error}` : ""}
                </p>

                {isActive && (
                  <Progress value={job.progress} className="mt-2.5 h-1.5" />
                )}

                {job.status === "completed" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {job.questions_imported} questions imported
                    </span>
                    {job.duplicates_found > 0 && (
                      <span className="tabular-nums">· {job.duplicates_found} possible duplicates</span>
                    )}
                    <Button asChild size="sm" variant="outline" className="ml-auto h-7 gap-1.5">
                      <Link href={`/faculty/review?job=${job.id}`}>
                        <ListChecks className="size-3.5" /> Review
                      </Link>
                    </Button>
                  </div>
                )}

                {job.status === "failed" && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5"
                      onClick={() => {
                        patchJob(job.id, { status: "pending", progress: 0, error: null });
                        void retryJob(job.id).then(() => driveJob(job.id));
                      }}
                    >
                      <RotateCcw className="size-3.5" /> Retry
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function retryJob(jobId: string) {
  // Reset happens server-side on the next tick when status is pending again;
  // the tick endpoint treats a failed job as terminal, so nudge it via the
  // dedicated retry endpoint.
  await fetch(`/api/ingestion/jobs/${jobId}/retry`, { method: "POST" });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
