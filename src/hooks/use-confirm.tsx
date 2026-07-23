import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

// Shared "are you sure?" dialog for destructive admin actions — call
// `confirm({ title, description })` and await the boolean instead of
// deleting on a single click. Render <ConfirmDialog /> once per page.
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const ConfirmDialog = () => (
    <Dialog open={options !== null} onOpenChange={(open) => { if (!open) settle(false); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => settle(false)}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {options?.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => settle(true)}
            className={
              options?.destructive === false
                ? "rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
                : "rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:brightness-110"
            }
          >
            {options?.confirmLabel ?? "Delete"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
