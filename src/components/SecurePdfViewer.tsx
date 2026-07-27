import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, X,
  ShieldAlert, Loader2,
} from "lucide-react";

const DEFAULT_WATERMARK = "Karn HR Academy – For Online Viewing Only";
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.2;
const PROGRESS_DEBOUNCE_MS = 800;

type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

// Lazy-loaded once per app session — pdfjs is heavy, and most visitors never
// open a PYQ, so this only pays its cost when someone actually does.
let pdfjsPromise: Promise<PdfjsModule> | null = null;
function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

// Burns the watermark directly into the rendered page's pixels (not a DOM
// overlay) so it survives a screenshot the same way the rest of the page
// does, and can't be peeled off with a devtools "delete element".
//
// Mirrors the two-part design already proven in src/lib/watermarkPdf.ts
// (the downloaded-copy watermark) rather than a dense tiled grid: a dense
// grid of full-sentence text at readable size crossed directly through
// every line of question text and made pages hard to read. Instead:
//   1. a small, steady footer label in the same low-traffic spot on every
//      page — always legible, so any screenshot is unambiguously marked
//      even if it misses the marks below;
//   2. a few large, very faint diagonal marks (short text, not the full
//      sentence — full-length text at a size big enough to notice would be
//      wider than the page) spread down the page, so a crop of any single
//      question still very likely catches one, without the collision
//      density of a full grid.
function drawWatermarkTiles(ctx: CanvasRenderingContext2D, width: number, height: number, text: string) {
  ctx.save();
  ctx.font = "11px 'Source Sans 3', sans-serif";
  ctx.fillStyle = "rgba(31, 78, 121, 0.5)";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, 12, height - 8);
  ctx.restore();

  const shortMark = "KARN HR ACADEMY";
  const diagSize = Math.max(24, Math.min(46, width * 0.065));
  ctx.save();
  ctx.font = `${diagSize}px 'Source Sans 3', sans-serif`;
  ctx.fillStyle = "rgba(31, 78, 121, 0.07)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const frac of [0.18, 0.5, 0.82]) {
    ctx.save();
    ctx.translate(width / 2, height * frac);
    ctx.rotate(-Math.PI / 8);
    ctx.fillText(shortMark, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

type Props = {
  fileUrl: string;
  watermarkText?: string;
  initialPage?: number;
  onPageChange?: (page: number, totalPages: number) => void;
};

const SecurePdfViewer = ({ fileUrl, watermarkText = DEFAULT_WATERMARK, initialPage = 1, onPageChange }: Props) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(initialPage);
  const [scale, setScale] = useState(1.1);
  const [pageRendering, setPageRendering] = useState(false);
  const [search, setSearch] = useState("");
  const [matchPages, setMatchPages] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);

  const pdfDocRef = useRef<any>(null);
  const pageTextsRef = useRef<Map<number, string>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const fitDoneRef = useRef(false);

  // ── Load the document ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fitDoneRef.current = false;
    pageTextsRef.current = new Map();
    setMatchPages([]);
    setSearch("");

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        // Fetched once into memory here — the resolved URL never lands in an
        // <a>, an <iframe src>, or the address bar; pdfjs gets raw bytes.
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const bytes = await res.arrayBuffer();
        if (cancelled) return;
        const doc = await pdfjs.getDocument({
          data: bytes,
          // Scanned exam papers are frequently JBIG2/JPX-compressed; without
          // this, pdfjs silently fails to decode those images (and, since
          // that failure happens mid-render, everything drawn after it on
          // the same canvas — including our watermark — never lands either).
          wasmUrl: "/pdfjs-wasm/",
        }).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setPageNum(p => Math.min(Math.max(1, initialPage || p), doc.numPages));
        setStatus("ready");
      } catch (e) {
        console.error("SecurePdfViewer: failed to load PDF", e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  // ── Fit the first page to the container's width once ────────────────────
  useEffect(() => {
    if (status !== "ready" || fitDoneRef.current || !pdfDocRef.current || !containerRef.current) return;
    fitDoneRef.current = true;
    (async () => {
      const page = await pdfDocRef.current.getPage(1);
      const naturalWidth = page.getViewport({ scale: 1 }).width;
      const available = containerRef.current!.clientWidth - 32;
      if (available > 0 && naturalWidth > 0) {
        const fit = Math.min(MAX_SCALE, Math.max(MIN_SCALE, available / naturalWidth));
        setScale(Math.round(fit * 20) / 20);
      }
    })();
  }, [status]);

  // ── Render the current page ──────────────────────────────────────────────
  useEffect(() => {
    if (status !== "ready" || !pdfDocRef.current || !canvasRef.current) return;
    let cancelled = false;
    setPageRendering(true);

    (async () => {
      const doc = pdfDocRef.current;
      const page = await doc.getPage(pageNum);
      if (cancelled) return;
      const canvas = canvasRef.current!;
      // Render at devicePixelRatio for retina crispness: the backing store
      // (canvas.width/height) is sized to the DPR-scaled viewport, then
      // constrained back down to the unscaled viewport via CSS. pdfjs does
      // NOT size the canvas itself even when given the `canvas` param — the
      // caller owns canvas.width/height, or rendering silently draws into
      // whatever the element's default (300×150) backing store already is.
      const dpr = window.devicePixelRatio || 1;
      const cssViewport = page.getViewport({ scale });
      const renderViewport = page.getViewport({ scale: scale * dpr });
      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      canvas.style.width = `${cssViewport.width}px`;
      canvas.style.height = `${cssViewport.height}px`;

      renderTaskRef.current?.cancel();
      const task = page.render({ canvas, viewport: renderViewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (e: any) {
        if (e?.name === "RenderingCancelledException") return;
        throw e;
      }
      if (cancelled) return;
      const ctx = canvas.getContext("2d")!;
      // page.render() leaves its own PDF-space-to-pixel transform on the
      // context — reset to identity before laying down our own, or the
      // watermark compounds on top of pdfjs's transform and lands off-canvas.
      ctx.resetTransform();
      // Watermark is drawn in CSS-pixel space (matching its font-size units)
      // over the DPR-scaled canvas, so it reads the same size on any screen.
      ctx.save();
      ctx.scale(dpr, dpr);
      drawWatermarkTiles(ctx, cssViewport.width, cssViewport.height, watermarkText);
      ctx.restore();
      setPageRendering(false);

      // Background text extraction for search — cached per page, never
      // rendered as selectable DOM text.
      if (!pageTextsRef.current.has(pageNum)) {
        try {
          const content = await page.getTextContent();
          const text = content.items.map((it: any) => it.str ?? "").join(" ");
          pageTextsRef.current.set(pageNum, text);
        } catch {
          // Search just won't find this page — not worth failing the view over.
        }
      }
    })();

    return () => { cancelled = true; };
  }, [status, pageNum, scale, watermarkText]);

  // ── Reading-progress callback, debounced ─────────────────────────────────
  useEffect(() => {
    if (status !== "ready" || !onPageChange || numPages === 0) return;
    const t = setTimeout(() => onPageChange(pageNum, numPages), PROGRESS_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [pageNum, numPages, status, onPageChange]);

  // ── Search across the whole document ─────────────────────────────────────
  const runSearch = useCallback(async (term: string) => {
    setSearch(term);
    if (!term.trim() || !pdfDocRef.current) { setMatchPages([]); return; }
    setSearching(true);
    const doc = pdfDocRef.current;
    const needle = term.trim().toLowerCase();
    const matches: number[] = [];
    for (let i = 1; i <= numPages; i++) {
      let text = pageTextsRef.current.get(i);
      if (text === undefined) {
        try {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          text = content.items.map((it: any) => it.str ?? "").join(" ");
          pageTextsRef.current.set(i, text);
        } catch {
          text = "";
        }
      }
      if (text.toLowerCase().includes(needle)) matches.push(i);
    }
    setMatchPages(matches);
    setSearching(false);
    if (matches.length > 0) setPageNum(matches[0]);
  }, [numPages]);

  // ── Deterrents: no context menu, no print/save shortcuts, no drag-out ───
  useEffect(() => {
    const blockShortcuts = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "p" || e.key === "P" || e.key === "s" || e.key === "S")) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", blockShortcuts);
    return () => document.removeEventListener("keydown", blockShortcuts);
  }, []);

  const goToPage = (n: number) => setPageNum(Math.min(Math.max(1, n), numPages));
  const zoomIn = () => setScale(s => Math.min(MAX_SCALE, Math.round((s + SCALE_STEP) * 20) / 20));
  const zoomOut = () => setScale(s => Math.max(MIN_SCALE, Math.round((s - SCALE_STEP) * 20) / 20));

  const currentMatchPos = matchPages.indexOf(pageNum);
  const jumpMatch = (dir: 1 | -1) => {
    if (matchPages.length === 0) return;
    const idx = currentMatchPos === -1 ? 0 : (currentMatchPos + dir + matchPages.length) % matchPages.length;
    setPageNum(matchPages[idx]);
  };

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
        <p className="font-medium text-muted-foreground">This paper couldn't be loaded.</p>
        <p className="text-sm text-muted-foreground">Please refresh the page or try again shortly.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-slate-50 px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(pageNum - 1)}
            disabled={status !== "ready" || pageNum <= 1}
            aria-label="Previous page"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {status === "ready" ? (
              <>
                Page{" "}
                <input
                  type="number"
                  value={pageNum}
                  min={1}
                  max={numPages}
                  onChange={e => goToPage(Number(e.target.value) || 1)}
                  className="w-10 rounded border border-border bg-white px-1 py-0.5 text-center text-xs"
                  aria-label="Page number"
                />{" "}
                of {numPages}
              </>
            ) : "—"}
          </span>
          <button
            onClick={() => goToPage(pageNum + 1)}
            disabled={status !== "ready" || pageNum >= numPages}
            aria-label="Next page"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <div className="flex items-center gap-1">
          <button onClick={zoomOut} disabled={status !== "ready"} aria-label="Zoom out"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-30">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={status !== "ready"} aria-label="Zoom in"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-30">
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => runSearch(e.target.value)}
            placeholder="Search this paper…"
            disabled={status !== "ready"}
            className="w-full rounded-md border border-border bg-white py-1.5 pl-8 pr-7 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {search && (
            <button onClick={() => runSearch("")} aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {search && (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {searching ? "Searching…" : matchPages.length === 0 ? "No matches" : (
              <span className="inline-flex items-center gap-1">
                {matchPages.length} page{matchPages.length !== 1 ? "s" : ""}
                <button onClick={() => jumpMatch(-1)} className="rounded p-0.5 hover:bg-white"><ChevronLeft className="h-3 w-3" /></button>
                <button onClick={() => jumpMatch(1)} className="rounded p-0.5 hover:bg-white"><ChevronRight className="h-3 w-3" /></button>
              </span>
            )}
          </span>
        )}
      </div>

      {/* ── Page surface ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onContextMenu={e => e.preventDefault()}
        className="relative flex min-h-[420px] justify-center overflow-auto bg-slate-100 p-4 select-none"
      >
        {status === "loading" && (
          <div className="flex w-full max-w-md flex-col items-center gap-3 py-16">
            <div className="aspect-[1/1.414] w-full animate-pulse rounded-md bg-slate-200" />
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading secure viewer…
            </p>
          </div>
        )}
        {status === "ready" && (
          <div className="relative">
            <canvas
              ref={canvasRef}
              onDragStart={e => e.preventDefault()}
              className="rounded-sm bg-white shadow-md"
            />
            {pageRendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                <Loader2 className="h-6 w-6 animate-spin text-accent-deep" />
              </div>
            )}
          </div>
        )}
      </div>

      <p className="border-t border-border bg-slate-50 px-3 py-2 text-center text-[11px] text-muted-foreground">
        For online viewing only — downloading and printing are disabled on this page.
      </p>
    </div>
  );
};

export default SecurePdfViewer;
