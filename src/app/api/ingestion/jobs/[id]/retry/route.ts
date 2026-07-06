import { NextResponse } from "next/server";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toSafeMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** Reset a failed job so it can be re-driven from its last completed stage. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertStaff();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: job } = await db
      .from("ingestion_jobs")
      .select("id, status, config")
      .eq("id", id)
      .single();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.status !== "failed") {
      return NextResponse.json({ error: "Only failed jobs can be retried" }, { status: 409 });
    }

    // A full retry re-parses the document, so drop this job's unreviewed
    // imports first — otherwise every retry would duplicate them.
    await db
      .from("questions")
      .delete()
      .eq("ingestion_job_id", id)
      .in("status", ["processing", "pending_review"])
      .is("reviewed_by", null);

    await db
      .from("ingestion_jobs")
      .update({
        status: "pending",
        error: null,
        progress: 0,
        questions_found: 0,
        questions_imported: 0,
        duplicates_found: 0,
        stage_detail: "Retrying from the beginning",
        lock_token: null,
        locked_at: null,
        finished_at: null,
        config: { retries: 0 },
      })
      .eq("id", id);

    await db.from("ingestion_events").insert({
      job_id: id,
      level: "info",
      message: "Job manually retried by faculty.",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const safe = toSafeMessage(err);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
