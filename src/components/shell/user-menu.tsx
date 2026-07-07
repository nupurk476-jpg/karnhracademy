"use client";

import Link from "next/link";
import { LogOut, GraduationCap, LayoutDashboard, Bookmark } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/lib/types";

export function UserMenu({ profile }: { profile: Profile }) {
  const initials = (profile.full_name ?? profile.email)
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  const isStaff = profile.role === "faculty" || profile.role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-ring focus-visible:ring-2">
        <Avatar className="size-8 border">
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{profile.full_name ?? "Student"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{profile.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <GraduationCap className="mr-2 size-4" /> Student portal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          {/* Bookmarks isn't in the 5-slot mobile bottom nav — keep it reachable here. */}
          <Link href="/bookmarks" className="cursor-pointer">
            <Bookmark className="mr-2 size-4" /> Bookmarks
          </Link>
        </DropdownMenuItem>
        {isStaff && (
          <DropdownMenuItem asChild>
            <Link href="/faculty" className="cursor-pointer">
              <LayoutDashboard className="mr-2 size-4" /> Faculty portal
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={() => void signOut()}
        >
          <LogOut className="mr-2 size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
