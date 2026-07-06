import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/logger";
import type { DocumentRow, IngestionJob, QuestionOption } from "@/lib/types";
import { extractFromFile, textToRows } from "./extract";
import { ocrImage, ocrPDFChunk, countPDFPages, OCR_PAGES_PER_CHUNK } from "./ocr";
import {
  chunkByQuestions,
  detectAnswerKeySection,
  findSourcePage,
} from "./heuristics";
import { parseTabularQuestions } from "./tabular";
import { extractQuestionsFromChunk } from "./llm-extract";
import {
  questionHash,
  sanitizeCandidate,
  overallConfidence,
} from "./normalize";
import {
  classifyQuestions,
  draftExplanations,
  embedQuestions,
  embeddingText,
  type SyllabusEntry,
} from "./enrich";
import type { AnswerKeyEntry, CandidateQuestion, JobCursor } from "./types";

const log = createLogger("ingestion");

const LOCK_STALE_MS = 3 * 60 * 1000;
const MAX_RETRIES = 3;
const PARSE_CHUNKS_PER_TICK = 1;
const ENRICH_BATCH_SIZE = 8;
const MAX_TEXT_CHARS = 1_500_000;

export interface TickResult {
  status: IngestionJob["status"];
  progress: number;
  detail: string | null;
  done: boolean;
}

/**
 * Advance an ingestion job by one bounded unit of work. Called repeatedly
 * (client-driven polling) so each invocation fits comfortably inside a
 * serverless execution window. Safe against concurrent ticks via an
 * optimistic lock with stale takeover.
 */
export async function processJobTick(jobId: string): Promise<TickResult> {
  const db = createAdminClient();

  const { data: job, error: jobErr } = await db
    .from("ingestion_jobs")
    .select("*")
    .eq("id", jobId)
    .single<IngestionJob>();
  if (jobErr || !job) throw new Error(`Job ${jobId} not found`);

  if (["completed", "failed", "cancelled"].includes(job.status)) {
    return { status: job.status, progress: job.progress, detail: job.stage_detail, done: true };
  }

  const lockToken = randomUUID();
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS).toISOString();
  const { data: locked } = await db
    .from("ingestion_jobs")
    .update({ lock_token: lockToken, locked_at: new Date().toISOString() })
    .eq("id", jobId)
    .or(`lock_token.is.null,locked_at.lt.${staleBefore}`)
    .select("id");

  if (!locked || locked.length === 0) {
    // Another tick is actively working — report current state, no double work.
    return { status: job.status, progress: job.progress, detail: "processing…", done: false };
  }

  const { data: doc } = await db
    .from("documents")
    .select("*")
    .eq("id", job.document_id)
    .single<DocumentRow>();
  if (!doc) {
    await failJob(db, job, "Source document is missing.");
    return { status: "failed", progress: job.progress, detail: null, done: true };
  }

  try {
    let result: TickResult;
    switch (job.status) {
      case "pending":
        result = await stageStart(db, job, doc);
        break;
      case "extracting":
        result = await stageExtract(db, job, doc);
        break;
      case "parsing":
        result = await stageParse(db, job, doc);
        break;
      case "enriching":
        result = await stageEnrich(db, job, doc);
        break;
      default:
        result = { status: job.status, progress: job.progress, detail: job.stage_detail, done: false };
    }
    await db
      .from("ingestion_jobs")
      .update({ lock_token: null, locked_at: null })
      .eq("id", jobId)
      .eq("lock_token", lockToken);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown pipeline error";
    log.error("tick failed", { jobId, stage: job.status, message });
    await logEvent(db, jobId, "error", `Stage "${job.status}" failed: ${message}`);

    const cursor = getCursor(job);
    const retries = (cursor.retries ?? 0) + 1;
    if (retries >= MAX_RETRIES) {
      await failJob(db, job, message);
      return { status: "failed", progress: job.progress, detail: message, done: true };
    }
    await db
      .from("ingestion_jobs")
      .update({
        config: { ...job.config, retries },
        lock_token: null,
        locked_at: null,
        stage_detail: `Retrying after error (${retries}/${MAX_RETRIES})`,
      })
      .eq("id", jobId);
    return {
      status: job.status,
      progress: job.progress,
      detail: `Error, will retry: ${message}`,
      done: false,
    };
  }
}

// ── Stage: start (download, hash, route extractor) ──────────────────────────

async function stageStart(
  db: SupabaseClient,
  job: IngestionJob,
  doc: DocumentRow,
): Promise<TickResult> {
  await logEvent(db, job.id, "info", `Processing "${doc.file_name}" (${formatBytes(doc.size_bytes)})`);

  const buffer = await downloadDocument(db, doc);
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // Same-file detection: warn (but continue) if this exact file was imported before.
  const { data: twin } = await db
    .from("documents")
    .select("id, file_name, created_at")
    .eq("sha256", sha256)
    .neq("id", doc.id)
    .limit(1);
  if (twin && twin.length > 0) {
    await logEvent(
      db,
      job.id,
      "warn",
      `This exact file was uploaded before as "${twin[0].file_name}" — expect duplicate questions.`,
    );
  }

  const extracted = await extractFromFile(buffer, doc.file_ext);

  await db
    .from("documents")
    .update({
      sha256,
      page_count: extracted.pageCount,
      needs_ocr: extracted.needsOCR,
      extracted_text: extracted.needsOCR ? null : extracted.text.slice(0, MAX_TEXT_CHARS),
      extraction_meta: extracted.meta,
    })
    .eq("id", doc.id);

  if (extracted.needsOCR) {
    await logEvent(db, job.id, "info", "No text layer found — running AI vision OCR.");
    await updateJob(db, job.id, {
      status: "extracting",
      stage_detail: "Scanned document detected — running OCR",
      progress: 5,
      started_at: job.started_at ?? new Date().toISOString(),
      config: { ...job.config, retries: 0, ocrChunk: 0 },
    });
    return { status: "extracting", progress: 5, detail: "Running OCR", done: false };
  }

  if (extracted.text.trim().length < 20) {
    await failJob(db, job, "No readable text could be extracted from this file.");
    return { status: "failed", progress: 0, detail: null, done: true };
  }

  await logEvent(
    db,
    job.id,
    "info",
    `Extracted ${extracted.text.length.toLocaleString()} characters${extracted.pageCount ? ` from ${extracted.pageCount} pages` : ""}.`,
  );
  await updateJob(db, job.id, {
    status: "parsing",
    stage_detail: "Detecting structure and splitting questions",
    progress: 30,
    started_at: job.started_at ?? new Date().toISOString(),
    config: { ...job.config, retries: 0, parseChunk: 0 },
  });
  return { status: "parsing", progress: 30, detail: "Splitting questions", done: false };
}

// ── Stage: extract (OCR continuation for scans/images) ──────────────────────

async function stageExtract(
  db: SupabaseClient,
  job: IngestionJob,
  doc: DocumentRow,
): Promise<TickResult> {
  const cursor = getCursor(job);
  const buffer = await downloadDocument(db, doc);
  const isImage = !doc.file_ext.toLowerCase().includes("pdf");

  if (isImage) {
    const text = await ocrImage(buffer, doc.mime_type ?? "image/png");
    await db
      .from("documents")
      .update({ extracted_text: text.slice(0, MAX_TEXT_CHARS) })
      .eq("id", doc.id);
    await logEvent(db, job.id, "info", `OCR complete (${text.length.toLocaleString()} characters).`);
    await updateJob(db, job.id, {
      status: "parsing",
      stage_detail: "OCR complete — splitting questions",
      progress: 30,
      config: { ...job.config, retries: 0, parseChunk: 0 },
    });
    return { status: "parsing", progress: 30, detail: "OCR complete", done: false };
  }

  const pageCount = doc.page_count ?? (await countPDFPages(buffer));
  const chunkIndex = cursor.ocrChunk ?? 0;
  const { text, done } = await ocrPDFChunk(buffer, chunkIndex, pageCount);

  const existing = doc.extracted_text ?? "";
  const combined = `${existing}${existing ? "\n\n" : ""}${text}`.slice(0, MAX_TEXT_CHARS);
  await db
    .from("documents")
    .update({ extracted_text: combined, page_count: pageCount })
    .eq("id", doc.id);

  const totalChunks = Math.ceil(pageCount / OCR_PAGES_PER_CHUNK);
  const progress = 5 + Math.round(((chunkIndex + 1) / totalChunks) * 25);
  await logEvent(
    db,
    job.id,
    "info",
    `OCR pages ${chunkIndex * OCR_PAGES_PER_CHUNK + 1}–${Math.min((chunkIndex + 1) * OCR_PAGES_PER_CHUNK, pageCount)} of ${pageCount}.`,
  );

  if (done) {
    await updateJob(db, job.id, {
      status: "parsing",
      stage_detail: "OCR complete — splitting questions",
      progress: 30,
      config: { ...job.config, retries: 0, parseChunk: 0 },
    });
    return { status: "parsing", progress: 30, detail: "OCR complete", done: false };
  }

  await updateJob(db, job.id, {
    stage_detail: `OCR in progress (${chunkIndex + 1}/${totalChunks} sections)`,
    progress,
    config: { ...job.config, retries: 0, ocrChunk: chunkIndex + 1 },
  });
  return { status: "extracting", progress, detail: "OCR in progress", done: false };
}

// ── Stage: parse (structure detection + LLM extraction) ─────────────────────

async function stageParse(
  db: SupabaseClient,
  job: IngestionJob,
  doc: DocumentRow,
): Promise<TickResult> {
  const cursor = getCursor(job);
  const text = doc.extracted_text ?? "";

  // Fast path: structured spreadsheets bypass the LLM entirely.
  if (doc.extraction_meta?.tabular && (cursor.parseChunk ?? 0) === 0) {
    const tabular = parseTabularQuestions(textToRows(text));
    if (tabular) {
      await logEvent(
        db,
        job.id,
        "info",
        `Structured table detected — imported ${tabular.candidates.length} rows directly (${tabular.skippedRows} rows skipped).`,
      );
      const inserted = await insertCandidates(db, job, doc, tabular.candidates, {
        wasOCR: false,
        topicHints: tabular.topicHints,
      });
      await updateJob(db, job.id, {
        status: "enriching",
        stage_detail: "Classifying, deduplicating and enriching",
        progress: 70,
        questions_found: inserted,
        config: { ...job.config, retries: 0 },
      });
      return { status: "enriching", progress: 70, detail: "Enriching questions", done: false };
    }
    // Not a recognizable question table — let the LLM interpret the text.
    await logEvent(db, job.id, "info", "Table headers not recognized — using AI extraction.");
  }

  const keySection = detectAnswerKeySection(text);
  const bodyText = keySection
    ? text.slice(0, keySection.start) + text.slice(keySection.end)
    : text;
  const chunks = chunkByQuestions(bodyText);
  const chunkIndex = cursor.parseChunk ?? 0;

  if (chunkIndex === 0 && keySection) {
    await logEvent(
      db,
      job.id,
      "info",
      `Detected an answer-key section with ${keySection.entries.length} entries.`,
    );
  }

  if (chunks.length === 0) {
    await failJob(db, job, "Document contained no parseable question text.");
    return { status: "failed", progress: job.progress, detail: null, done: true };
  }

  const end = Math.min(chunkIndex + PARSE_CHUNKS_PER_TICK, chunks.length);
  let found = job.questions_found;
  const collectedKeys: AnswerKeyEntry[] = [...(cursor.answerKey ?? [])];
  const kindVotes: string[] = (job.config.kindVotes as string[]) ?? [];

  for (let i = chunkIndex; i < end; i++) {
    const result = await extractQuestionsFromChunk(chunks[i], {
      fileName: doc.file_name,
      chunkIndex: i,
      totalChunks: chunks.length,
      wasOCR: doc.needs_ocr,
    });
    kindVotes.push(result.document_kind);

    const candidates = result.questions.map(sanitizeCandidate);
    const inserted = await insertCandidates(db, job, doc, candidates, {
      wasOCR: doc.needs_ocr,
      startOrder: found,
      rawText: text,
    });
    found += inserted;

    for (const entry of result.answer_key ?? []) {
      if (!collectedKeys.some((k) => k.number === entry.number)) collectedKeys.push(entry);
    }
    await logEvent(
      db,
      job.id,
      "info",
      `Section ${i + 1}/${chunks.length}: found ${candidates.length} questions${result.answer_key?.length ? `, ${result.answer_key.length} key entries` : ""}.`,
    );
  }

  // Heuristic key section wins over LLM-scraped entries (deterministic parse).
  for (const entry of keySection?.entries ?? []) {
    const existing = collectedKeys.findIndex((k) => k.number === entry.number);
    if (existing >= 0) collectedKeys[existing] = { ...collectedKeys[existing], ...entry };
    else collectedKeys.push(entry);
  }

  const doneParsing = end >= chunks.length;
  if (!doneParsing) {
    const progress = 30 + Math.round((end / chunks.length) * 40);
    await updateJob(db, job.id, {
      stage_detail: `AI extraction (section ${end}/${chunks.length})`,
      progress,
      questions_found: found,
      config: { ...job.config, retries: 0, parseChunk: end, answerKey: collectedKeys, kindVotes },
    });
    return { status: "parsing", progress, detail: "Extracting questions", done: false };
  }

  // Parsing finished — apply answer keys, set document kind, move on.
  const applied = await applyAnswerKey(db, job, collectedKeys);
  if (applied > 0) {
    await logEvent(db, job.id, "info", `Applied answer key to ${applied} questions.`);
  }

  const kind = majorityKind(kindVotes, found);
  await db.from("documents").update({ kind }).eq("id", doc.id);

  // Pure answer-key document targeting a previously uploaded question file.
  if (kind === "answer_key" && found === 0) {
    if (doc.linked_document_id && collectedKeys.length > 0) {
      const appliedLinked = await applyAnswerKeyToDocument(
        db,
        job,
        doc.linked_document_id,
        collectedKeys,
      );
      await logEvent(
        db,
        job.id,
        "info",
        `Answer-key document: updated ${appliedLinked} questions from the linked upload.`,
      );
      await completeJob(db, job.id, found, appliedLinked);
      return { status: "completed", progress: 100, detail: "Answer key applied", done: true };
    }
    if (collectedKeys.length > 0) {
      await failJob(
        db,
        job,
        "This looks like a standalone answer key. Re-upload it and link it to the question document it belongs to.",
      );
      return { status: "failed", progress: job.progress, detail: null, done: true };
    }
  }

  if (found === 0) {
    await failJob(db, job, "No questions could be identified in this document.");
    return { status: "failed", progress: job.progress, detail: null, done: true };
  }

  await updateJob(db, job.id, {
    status: "enriching",
    stage_detail: "Classifying, deduplicating and enriching",
    progress: 70,
    questions_found: found,
    config: { ...job.config, retries: 0, answerKey: collectedKeys, kindVotes },
  });
  return { status: "enriching", progress: 70, detail: "Enriching questions", done: false };
}

// ── Stage: enrich (classification, dedup, embeddings, explanations) ─────────

async function stageEnrich(
  db: SupabaseClient,
  job: IngestionJob,
  _doc: DocumentRow,
): Promise<TickResult> {
  const { data: batchRaw } = await db
    .from("questions")
    .select("id, stem, options, correct_options, answer_text, explanation, confidence, import_warnings, normalized_hash")
    .eq("ingestion_job_id", job.id)
    .eq("status", "processing")
    .order("source_order", { ascending: true })
    .limit(ENRICH_BATCH_SIZE);

  const batch = batchRaw ?? [];

  if (batch.length === 0) {
    await completeJob(db, job.id, job.questions_found, job.questions_imported);
    return { status: "completed", progress: 100, detail: "Import complete", done: true };
  }

  const syllabus = await loadSyllabus(db);

  const [classifications, explanations, embeddings] = await Promise.all([
    classifyQuestions(batch, syllabus).catch((e) => {
      log.warn("classification failed", { jobId: job.id, error: String(e) });
      return new Map<string, never>() as Awaited<ReturnType<typeof classifyQuestions>>;
    }),
    draftExplanations(batch).catch((e) => {
      log.warn("explanation drafting failed", { jobId: job.id, error: String(e) });
      return new Map<string, never>() as Awaited<ReturnType<typeof draftExplanations>>;
    }),
    embedQuestions(
      batch.map((q) => ({ id: q.id, text: embeddingText(q.stem, q.options) })),
    ).catch((e) => {
      log.warn("embedding failed", { jobId: job.id, error: String(e) });
      return new Map<string, number[]>();
    }),
  ]);

  let duplicatesFound = job.duplicates_found;

  for (const q of batch) {
    const cls = classifications.get(q.id);
    const expl = explanations.get(q.id);
    const vector = embeddings.get(q.id);

    const confidence = { ...(q.confidence ?? {}) } as Record<string, number>;
    const update: Record<string, unknown> = { status: "pending_review" };

    if (cls) {
      const entry = cls.topic_index !== null ? syllabus[cls.topic_index] : undefined;
      if (entry) {
        update.topic_id = entry.topicId;
        update.unit_id = entry.unitId;
      }
      update.difficulty = cls.difficulty;
      update.keywords = cls.keywords;
      confidence.classification = cls.confidence;
    }

    if (expl && !q.explanation) {
      update.explanation = expl.explanation;
      update.explanation_is_ai = true;
      confidence.explanation = expl.confidence;
    }

    if (vector) {
      update.embedding = JSON.stringify(vector);
    }

    update.confidence = confidence;

    await db.from("questions").update(update).eq("id", q.id);

    // Duplicate detection: hash → trigram → embedding (RPC handles all three).
    const { data: similar } = await db.rpc("find_similar_questions", {
      p_hash: q.normalized_hash,
      p_stem: q.stem,
      p_embedding: vector ? JSON.stringify(vector) : null,
      p_exclude: q.id,
      p_limit: 5,
    });

    for (const hit of similar ?? []) {
      const { error: dupErr } = await db.from("question_duplicates").upsert(
        {
          question_id: q.id,
          duplicate_id: hit.id,
          similarity: hit.similarity,
          method: hit.method,
        },
        { onConflict: "question_id,duplicate_id", ignoreDuplicates: true },
      );
      if (!dupErr) duplicatesFound++;
      if (hit.method === "hash") {
        await db
          .from("questions")
          .update({
            import_warnings: [
              ...(q.import_warnings ?? []),
              "Exact duplicate of an existing question — resolve in the Duplicate Manager.",
            ],
          })
          .eq("id", q.id);
      }
    }
  }

  const imported = job.questions_imported + batch.length;
  const progress =
    70 + Math.min(29, Math.round((imported / Math.max(job.questions_found, 1)) * 30));

  await updateJob(db, job.id, {
    stage_detail: `Enriched ${imported}/${job.questions_found} questions`,
    progress,
    questions_imported: imported,
    duplicates_found: duplicatesFound,
    config: { ...job.config, retries: 0 },
  });

  return {
    status: "enriching",
    progress,
    detail: `Enriched ${imported}/${job.questions_found}`,
    done: false,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCursor(job: IngestionJob): JobCursor {
  return (job.config ?? {}) as JobCursor;
}

async function downloadDocument(db: SupabaseClient, doc: DocumentRow): Promise<Buffer> {
  const { data, error } = await db.storage.from("ingestion").download(doc.storage_path);
  if (error || !data) throw new Error(`Could not download source file: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function insertCandidates(
  db: SupabaseClient,
  job: IngestionJob,
  doc: DocumentRow,
  candidates: CandidateQuestion[],
  opts: {
    wasOCR: boolean;
    startOrder?: number;
    rawText?: string;
    topicHints?: (string | null)[];
  },
): Promise<number> {
  if (candidates.length === 0) return 0;

  const rows = candidates.map((c, i) => {
    const confidence: Record<string, number> = { ...c.confidence };
    if (opts.wasOCR) confidence.ocr = Math.min(confidence.stem ?? 0.8, 0.8);
    const overall = overallConfidence(c.confidence);

    const hint = opts.topicHints?.[i];
    const keywords = hint ? [hint.toLowerCase().trim()] : [];

    return {
      status: "processing",
      question_type: c.question_type,
      stem: c.stem,
      options: c.options as QuestionOption[] | null,
      correct_options: c.correct_options,
      answer_text: c.answer_text,
      explanation: c.explanation,
      explanation_is_ai: false,
      keywords,
      confidence,
      overall_confidence: overall,
      document_id: doc.id,
      ingestion_job_id: job.id,
      source_page: opts.rawText ? findSourcePage(opts.rawText, c.stem) : null,
      source_order: c.number ?? (opts.startOrder ?? 0) + i + 1,
      source_excerpt: excerptFor(opts.rawText, c.stem),
      import_warnings: c.warnings,
      normalized_hash: questionHash(c.stem, c.options),
      created_by: job.created_by,
    };
  });

  const { data, error } = await db.from("questions").insert(rows).select("id");
  if (error) throw new Error(`Failed to save questions: ${error.message}`);

  const revisions = (data ?? []).map((row) => ({
    question_id: row.id,
    actor_id: job.created_by,
    action: "imported",
    changes: { source: doc.file_name, job_id: job.id },
    note: `Imported from "${doc.file_name}"`,
  }));
  if (revisions.length > 0) await db.from("question_revisions").insert(revisions);

  return rows.length;
}

function excerptFor(rawText: string | undefined, stem: string): string | null {
  if (!rawText) return null;
  const needle = stem.slice(0, 60).trim();
  if (needle.length < 12) return null;
  const idx = rawText.indexOf(needle);
  if (idx === -1) return null;
  return rawText.slice(Math.max(0, idx - 40), idx + 400).trim();
}

/** Fill missing answers on this job's questions from collected key entries. */
async function applyAnswerKey(
  db: SupabaseClient,
  job: IngestionJob,
  entries: AnswerKeyEntry[],
): Promise<number> {
  if (entries.length === 0) return 0;

  const { data: candidates } = await db
    .from("questions")
    .select("id, source_order, options, correct_options, answer_text, explanation, confidence, import_warnings")
    .eq("ingestion_job_id", job.id)
    .is("correct_options", null);

  return applyEntriesToQuestions(db, candidates ?? [], entries);
}

/** Apply a standalone answer-key document to its linked question document. */
async function applyAnswerKeyToDocument(
  db: SupabaseClient,
  job: IngestionJob,
  linkedDocumentId: string,
  entries: AnswerKeyEntry[],
): Promise<number> {
  const { data: candidates } = await db
    .from("questions")
    .select("id, source_order, options, correct_options, answer_text, explanation, confidence, import_warnings")
    .eq("document_id", linkedDocumentId)
    .in("status", ["processing", "pending_review", "approved"]);

  return applyEntriesToQuestions(db, candidates ?? [], entries, job.created_by);
}

interface KeyTarget {
  id: string;
  source_order: number | null;
  options: QuestionOption[] | null;
  correct_options: string[] | null;
  answer_text: string | null;
  explanation: string | null;
  confidence: Record<string, number>;
  import_warnings: string[];
}

async function applyEntriesToQuestions(
  db: SupabaseClient,
  questions: KeyTarget[],
  entries: AnswerKeyEntry[],
  actorId?: string,
): Promise<number> {
  const byNumber = new Map(entries.map((e) => [e.number, e]));
  let applied = 0;

  for (const q of questions) {
    if (q.source_order === null) continue;
    const entry = byNumber.get(q.source_order);
    if (!entry) continue;

    const update: Record<string, unknown> = {};
    const confidence = { ...(q.confidence ?? {}) };
    const warnings = [...(q.import_warnings ?? [])];

    if (entry.correct_options?.length && !q.correct_options?.length) {
      const validKeys = new Set((q.options ?? []).map((o) => o.key));
      const usable = entry.correct_options.filter((k) => validKeys.size === 0 || validKeys.has(k));
      if (usable.length > 0) {
        update.correct_options = usable;
        confidence.answer = 0.85;
      } else {
        warnings.push(
          `Answer key says "${entry.correct_options.join(", ")}" but no matching option exists.`,
        );
      }
    }
    if (entry.answer_text && !q.answer_text && !update.correct_options) {
      update.answer_text = entry.answer_text;
      confidence.answer = 0.8;
    }
    if (entry.explanation && !q.explanation) {
      update.explanation = entry.explanation;
      confidence.explanation = 0.8;
    }

    if (Object.keys(update).length === 0 && warnings.length === q.import_warnings.length) {
      continue;
    }

    update.confidence = confidence;
    update.import_warnings = warnings;
    await db.from("questions").update(update).eq("id", q.id);

    if (update.correct_options || update.answer_text) {
      applied++;
      if (actorId) {
        await db.from("question_revisions").insert({
          question_id: q.id,
          actor_id: actorId,
          action: "answer_key_applied",
          changes: { entry },
          note: "Answer filled from a separately uploaded answer key",
        });
      }
    }
  }

  return applied;
}

async function loadSyllabus(db: SupabaseClient): Promise<SyllabusEntry[]> {
  const { data } = await db
    .from("topics")
    .select("id, unit_id, title, syllabus_units!inner(id, code, title, is_active)")
    .eq("is_active", true);

  return (data ?? [])
    .filter((t) => {
      const unit = t.syllabus_units as unknown as { is_active: boolean };
      return unit.is_active;
    })
    .map((t) => {
      const unit = t.syllabus_units as unknown as { code: string; title: string };
      return {
        topicId: t.id,
        unitId: t.unit_id,
        label: `${unit.code} ${unit.title} :: ${t.title}`,
      };
    });
}

function majorityKind(votes: string[], questionsFound: number): "questions" | "answer_key" | "mixed" | "unknown" {
  if (votes.length === 0) return "unknown";
  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v, (counts.get(v) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  if (top === "answer_key" && questionsFound > 0) return "mixed";
  if (top === "questions" || top === "answer_key" || top === "mixed") return top;
  return "unknown";
}

async function updateJob(
  db: SupabaseClient,
  jobId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.from("ingestion_jobs").update(patch).eq("id", jobId);
  if (error) throw new Error(`Failed to update job: ${error.message}`);
}

async function completeJob(
  db: SupabaseClient,
  jobId: string,
  found: number,
  imported: number,
): Promise<void> {
  await updateJob(db, jobId, {
    status: "completed",
    stage_detail: null,
    progress: 100,
    questions_found: found,
    questions_imported: imported,
    finished_at: new Date().toISOString(),
  });
  await logEvent(
    db,
    jobId,
    "info",
    `Import complete: ${imported} questions sent to the review queue.`,
  );
}

async function failJob(db: SupabaseClient, job: IngestionJob, message: string): Promise<void> {
  await db
    .from("ingestion_jobs")
    .update({
      status: "failed",
      error: message,
      stage_detail: null,
      finished_at: new Date().toISOString(),
      lock_token: null,
      locked_at: null,
    })
    .eq("id", job.id);
  await logEvent(db, job.id, "error", message);
}

async function logEvent(
  db: SupabaseClient,
  jobId: string,
  level: "debug" | "info" | "warn" | "error",
  message: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await db.from("ingestion_events").insert({ job_id: jobId, level, message, meta });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
