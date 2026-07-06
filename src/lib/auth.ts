import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import type { Profile } from "@/lib/types";

/** Current user's profile (request-scoped cache), or null when signed out. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  return data ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireStaffProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "faculty" && profile.role !== "admin") redirect("/dashboard");
  return profile;
}

/** Non-redirecting guards for route handlers / server actions. */
export async function assertStaff(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) throw new AppError("unauthorized", "Sign in required.");
  if (profile.role !== "faculty" && profile.role !== "admin") {
    throw new AppError("forbidden", "Faculty access required.");
  }
  return profile;
}

export async function assertAdmin(): Promise<Profile> {
  const profile = await assertStaff();
  if (profile.role !== "admin") throw new AppError("forbidden", "Admin access required.");
  return profile;
}

export async function assertUser(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) throw new AppError("unauthorized", "Sign in required.");
  return profile;
}
