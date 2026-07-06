import { requireStaffProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FacultyShell } from "@/components/shell/faculty-shell";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaffProfile();
  const supabase = await createClient();

  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  return (
    <FacultyShell profile={profile} reviewCount={count ?? 0}>
      {children}
    </FacultyShell>
  );
}
