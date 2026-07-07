"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult, toSafeMessage } from "@/lib/errors";
import { questionHash } from "@/lib/ingestion/normalize";
import type { QuestionStatus } from "@/lib/types";

/**
 * Faculty review workflow. Every action writes an audit revision. Publishing
 * is always an explicit human decision — the pipeline can only ever reach
 * "pending_review".
 */

const editSchema = z.object({
  id: z.string().uuid(),
  stem: z.string().min(3).max(8000),
  question_type: z.enum(["mcq_single", "mcq_multi", "true_false", "numeric", "descriptive"]),
  options: z
    .array(z.object({ key: z.string().min(1).max(4), text: z.string().max(2000) }))
    .nullable(),
  correct_options: z.array(z.string()).nullable(),
  answer_text: z.string().max(4000).nullable(),
  explanation: z.string().max(8000).nullable(),
  unit_id: z.string().uuid().nullable(),
  topic_id: z.string().uuid().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
  keywords: z.array(z.string().max(60)).max(12),
});

export async function saveQuestion(
  input: z.infer<typeof editSchema>,
): Promise<ActionResult<undefined>> {
  try {
    const profile = await assertStaff();
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) {
      return fail(`Invalid question: ${parsed.error.issues[0]?.message ?? "check the fields"}`);
    }
    const q = parsed.data;

    if (q.options && q.correct_options) {
      const valid = new Set(q.options.map((o) => o.key));
      if (q.correct_options.some((k) => !valid.has(k))) {
        return fail("Correct answer must reference an existing option.");
      }
    }
    if (q.question_type === "mcq_single" && (q.correct_options?.length ?? 0) > 1) {
      return fail("Single-answer questions can only have one correct option.");
    }

    const supabase = await createClient();
    const { data: before } = await supabase
      .from("questions")
      .select("stem, options, correct_options, answer_text, explanation, unit_id, topic_id, difficulty, explanation_is_ai")
      .eq("id", q.id)
      .single();
    if (!before) return fail("Question not found.");

    const explanationEdited = (q.explanation ?? null) !== (before.explanation ?? null);

    const { error } = await supabase
      .from("questions")
      .update({
        stem: q.stem,
        question_type: q.question_type,
        options: q.options,
        correct_options: q.correct_options?.length ? q.correct_options : null,
        answer_text: q.answer_text,
        explanation: q.explanation,
        // Once a human edits the explanation it is no longer an AI draft.
        explanation_is_ai: explanationEdited ? false : before.explanation_is_ai,
        unit_id: q.unit_id,
        topic_id: q.topic_id,
        difficulty: q.difficulty,
        keywords: q.keywords,
        normalized_hash: questionHash(q.stem, q.options),
        reviewed_by: profile.id,
      })
      .eq("id", q.id);
    if (error) return fail("Could not save the question.");

    await supabase.from("question_revisions").insert({
      question_id: q.id,
      actor_id: profile.id,
      action: "updated",
      changes: { before, after: q },
    });

    revalidatePath("/faculty/review");
    revalidatePath(`/faculty/review/${q.id}`);
    return ok(undefined);
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

const transitionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(["approve", "publish", "reject", "unpublish"]),
  note: z.string().max(500).optional(),
});

const TRANSITIONS: Record<
  z.infer<typeof transitionSchema>["action"],
  { from: QuestionStatus[]; to: QuestionStatus }
> = {
  approve: { from: ["pending_review"], to: "approved" },
  // archived → published makes unpublish reversible
  publish: { from: ["pending_review", "approved", "archived"], to: "published" },
  reject: { from: ["pending_review", "approved", "archived"], to: "rejected" },
  unpublish: { from: ["published"], to: "archived" },
};

/** Single or bulk status transition with validation of the state machine. */
export async function transitionQuestions(
  input: z.infer<typeof transitionSchema>,
): Promise<ActionResult<{ updated: number; blocked: number }>> {
  try {
    const profile = await assertStaff();
    const parsed = transitionSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid request.");
    const { ids, action, note } = parsed.data;
    const transition = TRANSITIONS[action];

    const supabase = await createClient();

    let blocked = 0;
    let eligible = ids;

    // Guard: a question can't be published without a stem + a usable answer.
    if (action === "publish") {
      const { data: rows } = await supabase
        .from("questions")
        .select("id, question_type, correct_options, answer_text, options")
        .in("id", ids);
      const publishable = (rows ?? []).filter((r) => {
        if (r.question_type === "descriptive") return true;
        if (r.question_type === "numeric") return Boolean(r.answer_text);
        return (r.correct_options?.length ?? 0) > 0 && (r.options?.length ?? 0) >= 2;
      });
      blocked = ids.length - publishable.length;
      eligible = publishable.map((r) => r.id);
      if (eligible.length === 0) {
        return fail("None of the selected questions have a confirmed answer — fill answers before publishing.");
      }
    }

    const patch: Record<string, unknown> = {
      status: transition.to,
      reviewed_by: profile.id,
    };
    if (action === "publish") {
      patch.published_by = profile.id;
      patch.published_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from("questions")
      .update(patch)
      .in("id", eligible)
      .in("status", transition.from)
      .select("id");
    if (error) return fail("Could not update the questions.");

    const revisions = (updated ?? []).map((row) => ({
      question_id: row.id,
      actor_id: profile.id,
      action,
      changes: { to: transition.to },
      note: note ?? null,
    }));
    if (revisions.length > 0) await supabase.from("question_revisions").insert(revisions);

    revalidatePath("/faculty/review");
    revalidatePath("/faculty");
    return ok({ updated: updated?.length ?? 0, blocked });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

const bulkEditSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  unit_id: z.string().uuid().nullable().optional(),
  topic_id: z.string().uuid().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
});

/** Bulk edit of taxonomy/difficulty across many questions at once. */
export async function bulkEditQuestions(
  input: z.infer<typeof bulkEditSchema>,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const profile = await assertStaff();
    const parsed = bulkEditSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid request.");
    const { ids, ...fields } = parsed.data;

    const patch: Record<string, unknown> = { reviewed_by: profile.id };
    if ("unit_id" in fields) patch.unit_id = fields.unit_id;
    if ("topic_id" in fields) patch.topic_id = fields.topic_id;
    if ("difficulty" in fields) patch.difficulty = fields.difficulty;
    if (Object.keys(patch).length <= 1) return fail("Nothing to update.");

    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from("questions")
      .update(patch)
      .in("id", ids)
      .select("id");
    if (error) return fail("Bulk edit failed.");

    const revisions = (updated ?? []).map((row) => ({
      question_id: row.id,
      actor_id: profile.id,
      action: "bulk_edited",
      changes: fields as Record<string, unknown>,
    }));
    if (revisions.length > 0) await supabase.from("question_revisions").insert(revisions);

    revalidatePath("/faculty/review");
    return ok({ updated: updated?.length ?? 0 });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

const duplicateSchema = z.object({
  duplicatePairId: z.string().uuid(),
  resolution: z.enum(["dismiss", "merge"]),
});

/**
 * Duplicate resolution. "merge" keeps the OLDER question, marks the newer as
 * duplicate, and copies any fields the kept question is missing (fills gaps —
 * never overwrites reviewed data).
 */
export async function resolveDuplicate(
  input: z.infer<typeof duplicateSchema>,
): Promise<ActionResult<undefined>> {
  try {
    const profile = await assertStaff();
    const parsed = duplicateSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid request.");
    const { duplicatePairId, resolution } = parsed.data;

    const admin = createAdminClient();
    const { data: pair } = await admin
      .from("question_duplicates")
      .select("*")
      .eq("id", duplicatePairId)
      .eq("status", "open")
      .single();
    if (!pair) return fail("Duplicate pair not found or already resolved.");

    if (resolution === "dismiss") {
      await admin
        .from("question_duplicates")
        .update({ status: "dismissed", resolved_by: profile.id, resolved_at: new Date().toISOString() })
        .eq("id", duplicatePairId);
      revalidatePath("/faculty/duplicates");
      return ok(undefined);
    }

    const { data: questions } = await admin
      .from("questions")
      .select("id, created_at, correct_options, answer_text, explanation, explanation_is_ai, unit_id, topic_id, difficulty, status")
      .in("id", [pair.question_id, pair.duplicate_id]);
    if (!questions || questions.length !== 2) return fail("Questions no longer exist.");

    // Keep the question in the healthier state first (never retire a live
    // published question in favor of a rejected twin), then the older one.
    const STATUS_RANK: Record<string, number> = {
      published: 0,
      approved: 1,
      pending_review: 2,
      processing: 3,
      archived: 4,
      duplicate: 5,
      rejected: 6,
    };
    const sorted = [...questions].sort((a, b) => {
      const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
      if (rank !== 0) return rank;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    const [keep, drop] = [sorted[0], sorted[1]];

    // Fill gaps on the kept question from the dropped one.
    const patch: Record<string, unknown> = {};
    if (!keep.correct_options?.length && drop.correct_options?.length) {
      patch.correct_options = drop.correct_options;
    }
    if (!keep.answer_text && drop.answer_text) patch.answer_text = drop.answer_text;
    if (!keep.explanation && drop.explanation) {
      patch.explanation = drop.explanation;
      patch.explanation_is_ai = drop.explanation_is_ai;
    }
    if (!keep.unit_id && drop.unit_id) patch.unit_id = drop.unit_id;
    if (!keep.topic_id && drop.topic_id) patch.topic_id = drop.topic_id;
    if (!keep.difficulty && drop.difficulty) patch.difficulty = drop.difficulty;
    if (Object.keys(patch).length > 0) {
      await admin.from("questions").update(patch).eq("id", keep.id);
    }

    await admin
      .from("questions")
      .update({ status: "duplicate", duplicate_of: keep.id, reviewed_by: profile.id })
      .eq("id", drop.id);

    await admin
      .from("question_duplicates")
      .update({ status: "merged", resolved_by: profile.id, resolved_at: new Date().toISOString() })
      .eq("id", duplicatePairId);

    await admin.from("question_revisions").insert([
      {
        question_id: keep.id,
        actor_id: profile.id,
        action: "merge_kept",
        changes: { merged_from: drop.id, filled: patch },
      },
      {
        question_id: drop.id,
        actor_id: profile.id,
        action: "merged",
        changes: { merged_into: keep.id },
      },
    ]);

    revalidatePath("/faculty/duplicates");
    revalidatePath("/faculty/review");
    return ok(undefined);
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}
