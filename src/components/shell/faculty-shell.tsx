"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  ListChecks,
  Cog,
  CopyX,
  History,
  Users,
  BookOpen,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./user-menu";
import type { Profile } from "@/lib/types";

const NAV = [
  { href: "/faculty", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/faculty/upload", label: "Upload Center", icon: Upload },
  { href: "/faculty/processing", label: "Processing Queue", icon: Cog },
  { href: "/faculty/review", label: "Review Queue", icon: ListChecks },
  { href: "/faculty/duplicates", label: "Duplicates", icon: CopyX },
  { href: "/faculty/imports", label: "Import History", icon: History },
  { href: "/faculty/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/faculty/users", label: "Users", icon: Users, adminOnly: true },
];

function NavLinks({
  role,
  pathname,
  reviewCount,
  onNavigate,
}: {
  role: Profile["role"];
  pathname: string;
  reviewCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 px-3">
      {NAV.filter((i) => !i.adminOnly || role === "admin").map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            {item.href === "/faculty/review" && reviewCount > 0 && (
              <Badge variant="secondary" className="px-1.5 text-[10px]">
                {reviewCount > 99 ? "99+" : reviewCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function FacultyShell({
  profile,
  reviewCount,
  children,
}: {
  profile: Profile;
  reviewCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const brand = (
    <Link href="/faculty" className="flex items-center gap-2 px-5 py-5 font-semibold">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        N
      </span>
      <span>
        NETAce <span className="text-muted-foreground">Faculty</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card md:flex">
        {brand}
        <NavLinks role={profile.role} pathname={pathname} reviewCount={reviewCount} />
        <div className="border-t p-4">
          <UserMenu profile={profile} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col py-2">
                {brand}
                <NavLinks
                  role={profile.role}
                  pathname={pathname}
                  reviewCount={reviewCount}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
          <span className="flex-1 font-semibold">Faculty</span>
          <UserMenu profile={profile} />
        </header>

        <main className="flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
