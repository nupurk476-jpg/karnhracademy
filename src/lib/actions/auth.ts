"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/errors";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = credentialsSchema.extend({
  fullName: z.string().min(2, "Tell us your name").max(120),
});

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<ActionResult<undefined>> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return fail(
      error.message.toLowerCase().includes("confirm")
        ? "Please confirm your email first — check your inbox."
        : "Incorrect email or password.",
    );
  }
  return ok(undefined);
}

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return fail("An account with this email already exists — try signing in.");
    }
    return fail("Could not create your account. Please try again.");
  }

  const needsConfirmation = !data.session;
  return ok({ needsConfirmation });
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
