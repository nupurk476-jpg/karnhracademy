"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, GraduationCap, BookUser } from "lucide-react";
import { toast } from "sonner";
import { setUserRole } from "@/lib/actions/admin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Profile, UserRole } from "@/lib/types";

const ROLE_META: Record<UserRole, { label: string; icon: React.ElementType; className: string }> = {
  student: { label: "Student", icon: GraduationCap, className: "bg-muted text-muted-foreground" },
  faculty: { label: "Faculty", icon: BookUser, className: "bg-accent text-accent-foreground" },
  admin: { label: "Admin", icon: ShieldCheck, className: "bg-primary/10 text-primary" },
};

export function UsersTable({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [changingId, setChangingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  function changeRole(userId: string, role: UserRole) {
    setChangingId(userId);
    startTransition(async () => {
      const result = await setUserRole({ userId, role });
      setChangingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Role updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-8"
        />
      </div>

      <ul className="divide-y rounded-2xl border bg-card">
        {filtered.map((user) => {
          const meta = ROLE_META[user.role];
          const initials = (user.full_name ?? user.email)
            .split(/[\s@]+/)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase() ?? "")
            .join("");
          return (
            <li key={user.id} className="flex items-center gap-3 p-3.5">
              <Avatar className="size-9 border">
                <AvatarFallback className="bg-muted text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.full_name ?? "Unnamed"}
                  {user.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant="outline" className={`hidden border-transparent gap-1 sm:inline-flex ${meta.className}`}>
                <meta.icon className="size-3" /> {meta.label}
              </Badge>
              <Select
                value={user.role}
                disabled={(pending && changingId === user.id) || user.id === currentUserId}
                onValueChange={(v) => changeRole(user.id, v as UserRole)}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="p-8 text-center text-sm text-muted-foreground">No users match.</li>
        )}
      </ul>
    </div>
  );
}
