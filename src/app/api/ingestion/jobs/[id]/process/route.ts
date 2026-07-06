import { NextResponse } from "next/server";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { processJobTick } from "@/lib/ingestion/pipeline";
import { toSafeMessage } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("api.ingestion.process");

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Advance an ingestion job by one bounded step. The Processing Queue UI calls
 * this repeatedly until { done: true } — each call fits inside a serverless
 * execution window, which makes long imports reliable on Vercel.
 */
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

    const result = await processJobTick(id);
    return NextResponse.json(result);
  } catch (err) {
    const safe = toSafeMessage(err);
    if (safe.code === "internal") {
      log.error("process tick error", { error: err instanceof Error ? err.message : String(err) });
    }
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
