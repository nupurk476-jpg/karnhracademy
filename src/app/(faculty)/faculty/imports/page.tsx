import type { Metadata } from "next";
import Link from "next/link";
import { FileClock, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImportEvents } from "./import-events";
import type { JobStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Import History" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<JobStatus, string> = {
  completed: "bg-success/15 text-success",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  extracting: "bg-accent text-accent-foreground",
  parsing: "bg-accent text-accent-foreground",
  enriching: "bg-accent text-accent-foreground",
};

export default async function ImportsPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("ingestion_jobs")
    .select(
      "id, status, questions_found, questions_imported, duplicates_found, error, created_at, finished_at, documents(file_name, file_ext, size_bytes, kind, needs_ocr), profiles:created_by(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="container max-w-5xl animate-fade-in-up space-y-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import History</h1>
          <p className="text-sm text-muted-foreground">
            Every document that has been through the ingestion pipeline, with full logs.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/faculty/upload">
            <Upload className="size-4" /> New upload
          </Link>
        </Button>
      </div>

      {!jobs || jobs.length === 0 ? (
        <EmptyState
          icon={<FileClock className="size-5" />}
          title="No imports yet"
          description="Your upload history and processing logs will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Imported</TableHead>
                <TableHead className="text-right">Duplicates</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const doc = job.documents as unknown as {
                  file_name: string;
                  needs_ocr: boolean;
                  kind: string;
                } | null;
                const uploader = job.profiles as unknown as { full_name: string | null } | null;
                return (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-56">
                      <p className="truncate font-medium">{doc?.file_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {uploader?.full_name ?? "Unknown"}
                        {doc?.needs_ocr ? " · OCR" : ""}
                        {doc?.kind === "answer_key" ? " · answer key" : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border-transparent capitalize ${STATUS_TONE[job.status as JobStatus]}`}
                      >
                        {job.status}
                      </Badge>
                      {job.error && (
                        <p className="mt-1 max-w-44 truncate text-xs text-destructive" title={job.error}>
                          {job.error}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {job.status === "completed" ? (
                        <Link
                          href={`/faculty/review?job=${job.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {job.questions_imported}
                        </Link>
                      ) : (
                        job.questions_imported
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{job.duplicates_found}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {new Date(job.created_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <ImportEvents jobId={job.id} fileName={doc?.file_name ?? "Document"} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
