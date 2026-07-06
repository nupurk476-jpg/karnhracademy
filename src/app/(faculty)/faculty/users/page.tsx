import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "User Management" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireStaffProfile();
  if (me.role !== "admin") redirect("/faculty");

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="container max-w-4xl animate-fade-in-up space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Promote faculty reviewers and manage roles. Students can only see published content.
        </p>
      </div>
      <UsersTable users={(users ?? []) as Profile[]} currentUserId={me.id} />
    </div>
  );
}
