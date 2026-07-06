import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProcessingList } from "./processing-list";
import type { IngestionJob } from "@/lib/types";

export const metadata: Metadata = { title: "Processing Queue" };
export const dynamic = "force-dynamic";

export interface JobWithDocument extends IngestionJob {
  documents: { file_name: string; file_ext: string; size_bytes: number; needs_ocr: boolean } | null;
}

export default async function ProcessingPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("ingestion_jobs")
    .select("*, documents(file_name, file_ext, size_bytes, needs_ocr)")
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="container max-w-3xl animate-fade-in-up space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Processing Queue</h1>
          <p className="text-sm text-muted-foreground">
            Live status of AI ingestion. Finished imports land in the Review Queue.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/faculty/upload">
            <Upload className="size-4" /> Upload more
          </Link>
        </Button>
      </div>

      <ProcessingList initialJobs={(jobs as JobWithDocument[]) ?? []} />
    </div>
  );
}
