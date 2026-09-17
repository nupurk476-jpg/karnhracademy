import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A checkbox built on a real <input type="checkbox">, not a div with an
 * onClick. The native control is kept (visually hidden, not display:none)
 * so the label, the keyboard, focus order and screen readers all work the
 * way the browser already knows how to make them work — with `peer`
 * driving the visible box off the input's own :checked and :focus-visible
 * state.
 *
 * Deliberately not @radix-ui/react-checkbox: this needs no portal, no
 * controlled-state machinery and no indeterminate state, and a dependency
 * is a thing to keep updated forever.
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  /** Right-aligned count, greyed when zero. */
  count?: number;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, count, disabled, ...props }, ref) => (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-md py-1.5 text-sm transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        ref={ref}
        disabled={disabled}
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-input bg-background transition-colors",
          "peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground",
          // The tick is a *descendant* of this span, and peer-checked only
          // reaches siblings of the input — so the variant has to be applied
          // here and reach down, not sit on the icon itself.
          "peer-checked:[&_svg]:opacity-100",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          !disabled && "group-hover:border-accent",
        )}
      >
        <Check className="h-3 w-3 opacity-0 transition-opacity" strokeWidth={3} />
      </span>
      <span className="flex-1 text-foreground">{label}</span>
      {count !== undefined && (
        <span className={cn("text-xs tabular-nums", count > 0 ? "text-muted-foreground" : "text-muted-foreground/50")}>
          {count}
        </span>
      )}
    </label>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
