"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportedFile } from "@/lib/ingestion/extract";
import { ok, fail, type ActionResult, toSafeMessage } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("actions.upload");

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const createUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(MAX_FILE_BYTES),
  mimeType: z.string().max(150).optional(),
});

/**
 * Step 1 of upload: mint a signed upload URL so the browser streams the file
 * straight to Supabase Storage (bypasses serverless body-size limits).
 */
export async function createUpload(
  input: z.infer<typeof createUploadSchema>,
): Promise<ActionResult<{ path: string; token: string }>> {
  try {
    await assertStaff();
    const parsed = createUploadSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid upload request.");
    const { fileName, sizeBytes } = parsed.data;

    if (!isSupportedFile(fileName)) {
      return fail(
        "Unsupported file type. Upload PDF, DOCX, CSV, XLSX, TXT, MD or an image (PNG/JPG/WEBP).",
      );
    }
    if (sizeBytes > MAX_FILE_BYTES) return fail("File is larger than the 50 MB limit.");

    const admin = createAdminClient();
    const safeName = fileName.replace(/[^\w.\-()\s]/g, "_").slice(-120);
    const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}/${safeName}`;

    const { data, error } = await admin.storage.from("ingestion").createSignedUploadUrl(path);
    if (error || !data) {
      log.error("signed url failed", { error: error?.message });
      return fail("Could not prepare the upload. Try again.");
    }

    return ok({ path: data.path, token: data.token });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

const finalizeSchema = z.object({
  path: z.string().min(1),
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().max(150).optional(),
  kind: z.enum(["questions", "answer_key", "unknown"]).default("unknown"),
  linkedDocumentId: z.string().uuid().nullable().optional(),
});

/**
 * Step 2: after the browser upload succeeds, register the document and queue
 * an ingestion job. Returns the job id for the processing screen.
 */
export async function finalizeUpload(
  input: z.infer<typeof finalizeSchema>,
): Promise<ActionResult<{ documentId: string; jobId: string }>> {
  try {
    const profile = await assertStaff();
    const parsed = finalizeSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid request.");
    const { path, fileName, sizeBytes, mimeType, kind, linkedDocumentId } = parsed.data;

    const admin = createAdminClient();

    // Confirm the object actually landed in storage.
    const dir = path.split("/").slice(0, -1).join("/");
    const base = path.split("/").pop()!;
    const { data: listed } = await admin.storage.from("ingestion").list(dir, { search: base });
    if (!listed?.some((f) => f.name === base)) {
      return fail("Upload not found in storage — please retry the upload.");
    }

    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

    const { data: doc, error: docErr } = await admin
      .from("documents")
      .insert({
        uploaded_by: profile.id,
        storage_path: path,
        file_name: fileName,
        file_ext: ext,
        mime_type: mimeType ?? null,
        size_bytes: sizeBytes,
        kind,
        linked_document_id: linkedDocumentId ?? null,
      })
      .select("id")
      .single();
    if (docErr || !doc) {
      log.error("document insert failed", { error: docErr?.message });
      return fail("Could not register the document.");
    }

    const { data: job, error: jobErr } = await admin
      .from("ingestion_jobs")
      .insert({ document_id: doc.id, created_by: profile.id })
      .select("id")
      .single();
    if (jobErr || !job) {
      log.error("job insert failed", { error: jobErr?.message });
      return fail("Could not queue the processing job.");
    }

    revalidatePath("/faculty/processing");
    revalidatePath("/faculty/imports");
    return ok({ documentId: doc.id, jobId: job.id });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

/** Documents eligible to be linked from an answer-key upload. */
export async function listLinkableDocuments(): Promise<
  ActionResult<{ id: string; file_name: string; created_at: string }[]>
> {
  try {
    await assertStaff();
    const admin = createAdminClient();
    const { data } = await admin
      .from("documents")
      .select("id, file_name, created_at, kind")
      .neq("kind", "answer_key")
      .order("created_at", { ascending: false })
      .limit(30);
    return ok(
      (data ?? []).map((d) => ({ id: d.id, file_name: d.file_name, created_at: d.created_at })),
    );
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}
