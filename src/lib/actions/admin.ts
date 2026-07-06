"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin, assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult, toSafeMessage } from "@/lib/errors";

/** User management (admin) and syllabus management (staff). */

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["student", "faculty", "admin"]),
});

export async function setUserRole(
  input: z.infer<typeof roleSchema>,
): Promise<ActionResult<undefined>> {
  try {
    const admin = await assertAdmin();
    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid request.");
    const { userId, role } = parsed.data;

    if (userId === admin.id && role !== "admin") {
      return fail("You cannot remove your own admin access.");
    }

    const db = createAdminClient();
    const { error } = await db.from("profiles").update({ role }).eq("id", userId);
    if (error) return fail("Could not update the role.");

    revalidatePath("/faculty/users");
    return ok(undefined);
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

const unitSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(12),
  title: z.string().min(2).max(120),
  description: z.string().max(500).nullable().optional(),
  order_index: z.number().int().min(0).max(999).default(0),
});

export async function saveUnit(
  input: z.infer<typeof unitSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    await assertStaff();
    const parsed = unitSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid unit.");
    const { id, ...fields } = parsed.data;

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("syllabus_units").update(fields).eq("id", id);
      if (error) return fail(dbMessage(error.message, "unit"));
      revalidatePath("/faculty/syllabus");
      return ok({ id });
    }
    const { data, error } = await supabase
      .from("syllabus_units")
      .insert(fields)
      .select("id")
      .single();
    if (error || !data) return fail(dbMessage(error?.message ?? "", "unit"));
    revalidatePath("/faculty/syllabus");
    return ok({ id: data.id });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

const topicSchema = z.object({
  id: z.string().uuid().optional(),
  unit_id: z.string().uuid(),
  title: z.string().min(2).max(120),
  order_index: z.number().int().min(0).max(999).default(0),
});

export async function saveTopic(
  input: z.infer<typeof topicSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    await assertStaff();
    const parsed = topicSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid topic.");
    const { id, ...fields } = parsed.data;

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("topics").update(fields).eq("id", id);
      if (error) return fail(dbMessage(error.message, "topic"));
      revalidatePath("/faculty/syllabus");
      return ok({ id });
    }
    const { data, error } = await supabase.from("topics").insert(fields).select("id").single();
    if (error || !data) return fail(dbMessage(error?.message ?? "", "topic"));
    revalidatePath("/faculty/syllabus");
    return ok({ id: data.id });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

export async function toggleTaxonomyActive(input: {
  table: "syllabus_units" | "topics";
  id: string;
  isActive: boolean;
}): Promise<ActionResult<undefined>> {
  try {
    await assertStaff();
    if (!z.string().uuid().safeParse(input.id).success) return fail("Invalid id.");
    if (input.table !== "syllabus_units" && input.table !== "topics") return fail("Invalid request.");

    const supabase = await createClient();
    const { error } = await supabase
      .from(input.table)
      .update({ is_active: input.isActive })
      .eq("id", input.id);
    if (error) return fail("Could not update.");
    revalidatePath("/faculty/syllabus");
    return ok(undefined);
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

function dbMessage(raw: string, entity: string): string {
  if (raw.includes("duplicate key")) return `A ${entity} with that name already exists.`;
  return `Could not save the ${entity}.`;
}
