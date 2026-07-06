import { requireProfile } from "@/lib/auth";
import { StudentShell } from "@/components/shell/student-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  return <StudentShell profile={profile}>{children}</StudentShell>;
}
