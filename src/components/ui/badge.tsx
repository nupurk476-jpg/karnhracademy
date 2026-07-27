import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border px-2.5 py-0.5 text-xs border-transparent bg-primary text-primary-foreground hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        secondary: "border px-2.5 py-0.5 text-xs border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        destructive: "border px-2.5 py-0.5 text-xs border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        outline: "border px-2.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        // ── Soft-tint content badges ──────────────────────────────────────
        // The four recurring "meaning" pills used on cards across notes,
        // quizzes, PYQs and search results — previously each hand-rolled
        // per file at slightly different sizes/paddings. One definition
        // per meaning now; size is a separate prop (below).
        subject: "bg-primary/10 text-primary",
        unit: "bg-accent/10 text-accent-deep",
        tag: "bg-muted text-muted-foreground",
        success: "bg-emerald-50 text-emerald-700",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
