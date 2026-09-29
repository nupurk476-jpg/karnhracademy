import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { openPdf } from "@/lib/pdfjs";

/** The cover plus the first two pages. */
const PREVIEW_PAGES = 3;
/** Retina sharpness without drawing 3x canvases on a phone. */
const MAX_DPR = 2;

type Props = {
  /** A fresh signed view URL; resolved once per mount. */
  resolveUrl: () => Promise<string | null>;
  /** Reports the document's real page count once it has loaded. */
  onPageCount?: (pages: number) => void;
};

/**
 * First pages of a PDF, drawn as images, shown before the download gate so
 * a visitor can see what they are giving an email for.
 *
 * Uses the pdfjs already bundled for the in-app reader (lazy-loaded, shared
 * via src/lib/pdfjs.ts), so this adds no dependency. Pages are drawn at the
 * container's width, which is what makes it hold up at 375px.
 */
const PdfPreview = ({ resolveUrl, onPageCount }: Props) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [shown, setShown] = useState(0);
  const docRef = useRef<Awaited<ReturnType<typeof openPdf>> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  // Kept in a ref so a caller passing an inline callback doesn't reload
  // the document on every render.
  const onPageCountRef = useRef(onPageCount);
  onPageCountRef.current = onPageCount;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await resolveUrl();
        if (!url) throw new Error("no preview url");
        const doc = await openPdf(url);
        if (cancelled) { void doc.loadingTask.destroy(); return; }
        docRef.current = doc;
        onPageCountRef.current?.(doc.numPages);
        setShown(Math.min(PREVIEW_PAGES, doc.numPages));
        setStatus("ready");
      } catch (e) {
        console.error("PdfPreview: failed to load PDF", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      void docRef.current?.loadingTask.destroy();
      docRef.current = null;
    };
    // resolveUrl is fixed for the life of one preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const doc = docRef.current;
    if (status !== "ready" || !doc) return;
    let cancelled = false;
    const tasks: { cancel: () => void }[] = [];
    const width = boxRef.current?.clientWidth || 320;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    (async () => {
      // One page at a time: the cover appears first instead of all three
      // arriving together after the slowest one.
      for (let i = 0; i < shown; i++) {
        if (cancelled) return;
        const canvas = canvases.current[i];
        if (!canvas) continue;
        try {
          const page = await doc.getPage(i + 1);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * dpr });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const task = page.render({ canvas, viewport });
          tasks.push(task);
          await task.promise;
        } catch (e: any) {
          if (e?.name === "RenderingCancelledException") return;
          console.error(`PdfPreview: page ${i + 1} failed`, e);
        }
      }
    })();

    return () => {
      cancelled = true;
      tasks.forEach((t) => t.cancel());
    };
  }, [status, shown]);

  if (status === "error") {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
        Preview isn't available right now — the full PDF still is.
      </p>
    );
  }

  return (
    <div ref={boxRef} className="space-y-3" aria-busy={status === "loading"}>
      {status === "loading" ? (
        <div className="flex aspect-[210/297] w-full items-center justify-center rounded-lg border border-border bg-muted/40">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
          </span>
        </div>
      ) : (
        Array.from({ length: shown }, (_, i) => (
          <figure key={i} className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
            <canvas
              ref={(el) => { canvases.current[i] = el; }}
              // A4-shaped placeholder until the real page size is known,
              // so the layout doesn't jump when the page draws.
              width={210}
              height={297}
              className="block h-auto w-full bg-white"
              aria-label={i === 0 ? "Cover page" : `Page ${i + 1}`}
              role="img"
            />
          </figure>
        ))
      )}
    </div>
  );
};

export default PdfPreview;
