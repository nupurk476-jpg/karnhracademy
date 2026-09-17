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

/**
 * How many pages either side of the visible ones are kept rendered.
 *
 * This is the whole memory story. Every rendered page is a canvas backing
 * store of roughly width × height × devicePixelRatio² × 4 bytes — at
 * fit-width on a retina phone that is several megabytes per page, so a
 * 100-page paper with every page rendered is hundreds of megabytes and a
 * hard crash on a mid-range Android. Pages outside this window keep their
 * placeholder (so the scrollbar never jumps) but have their backing store
 * released.
 *
 * One page of slack each way means scrolling at a normal reading pace
 * always meets an already-drawn page.
 */
const RENDER_WINDOW = 1;

/** Pages this far outside the viewport still count as "coming up". */
const PREFETCH_MARGIN_PX = 300;

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
  // Which page the reader is looking at. Now an OUTPUT of scroll position
  // rather than the input that decides what is drawn — the toolbar, the
  // reading-progress callback and the search-match position all read it.
  const [pageNum, setPageNum] = useState(initialPage);
  const [scale, setScale] = useState(1.1);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [matchPages, setMatchPages] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  /** Unscaled page dimensions, so a placeholder is the right size before
      its page has ever been drawn and the page below it doesn't shift. */
  const [pageSizes, setPageSizes] = useState<{ width: number; height: number }[]>([]);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(() => new Set([1]));
  const [renderingPages, setRenderingPages] = useState<Set<number>>(() => new Set());

  const pdfDocRef = useRef<any>(null);
  const pageTextsRef = useRef<Map<number, string>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const pageElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const canvasElsRef = useRef<(HTMLCanvasElement | null)[]>([]);
  /** page → the scale it was last drawn at, so a zoom invalidates it. */
  const renderedAtRef = useRef<Map<number, number>>(new Map());
  const renderTasksRef = useRef<Map<number, any>>(new Map());
  /**
   * page → a counter bumped every time the page is freed.
   *
   * Cancelling the pdfjs task is not enough on its own: a render that is
   * still awaiting getPage() has no task to cancel yet, so freeing the page
   * at that moment does nothing and the draw completes afterwards — sizing
   * the canvas back up and stranding its memory outside the window. On a
   * long document, fast scrolling strands enough of them to undo the whole
   * point of the window. Each render captures the counter and abandons
   * itself if it has moved.
   */
  const renderEpochsRef = useRef<Map<number, number>>(new Map());
  /**
   * page → the scale a render is CURRENTLY drawing it at.
   *
   * Registered synchronously, before the first await, for two reasons.
   * pdfjs refuses two concurrent render() calls on one canvas outright
   * ("Cannot use the same canvas during multiple render operations"), and
   * the window effect can fire twice in quick succession — two observer
   * callbacks, or a zoom landing on top of one — with renderedAtRef not yet
   * updated by the first pass, so it would ask for the same page twice.
   * It also makes an in-flight page visible to the free loop below, which
   * can then cancel it when the window moves on.
   */
  const inFlightRef = useRef<Map<number, number>>(new Map());
  /** page → how much of it is on screen, for picking the "current" page. */
  const ratiosRef = useRef<Map<number, number>>(new Map());
  const fitDoneRef = useRef(false);
  /** Set once the fitted scale has actually been applied — fitDoneRef only
      guards re-entry, and is true a tick before the scale lands. */
  const fitAppliedRef = useRef(false);
  /** Set while a programmatic scroll is in flight, so the observer does not
      fight the jump by reporting pages passed through on the way. */
  const scrollingToRef = useRef<number | null>(null);
  /** Guards the one-time jump to `initialPage`. */
  const openedAtRef = useRef(false);
  /**
   * The pages currently worth holding.
   *
   * The effect below frees whatever has fallen outside the window, but it
   * can only free what is already drawn — a render still in flight when the
   * window moves is not yet in renderedAtRef, so it completes into a page
   * nobody is looking at and is never revisited. Reading this ref after
   * each await lets such a render bow out (or clean up after itself).
   * Resuming a long paper mid-document hits this every time: pages 1–2
   * start drawing, the jump to page 40 lands, and their draws finish into
   * the void above.
   */
  const wantedRef = useRef<Set<number>>(new Set());
  // The scale that fits the page's full width at the last measured
  // container size. Doubles as the floor for manual zoom-out below — see
  // where it's set for why MIN_SCALE alone can't be that floor.
  const fitScaleRef = useRef(MIN_SCALE);

  // ── Load the document ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fitDoneRef.current = false;
    fitAppliedRef.current = false;
    openedAtRef.current = false;
    pageTextsRef.current = new Map();
    renderedAtRef.current = new Map();
    renderEpochsRef.current = new Map();
    inFlightRef.current = new Map();
    ratiosRef.current = new Map();
    setMatchPages([]);
    setSearch("");
    setPageSizes([]);
    setVisiblePages(new Set([1]));

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

        // Every page's dimensions up front, so all placeholders are the
        // right height from the first paint. Measuring only page 1 and
        // assuming the rest match is cheaper, but a single landscape or
        // A3 page in the middle then resizes as it draws and yanks the
        // scroll position out from under whoever is reading. getPage only
        // parses the page dictionary, so this is metadata, not rendering.
        const sizes = await Promise.all(
          Array.from({ length: doc.numPages }, async (_, i) => {
            const vp = (await doc.getPage(i + 1)).getViewport({ scale: 1 });
            return { width: vp.width, height: vp.height };
          }),
        );
        if (cancelled) return;
        setPageSizes(sizes);
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
    if (status !== "ready" || fitDoneRef.current || !containerRef.current || pageSizes.length === 0) return;
    fitDoneRef.current = true;
    (async () => {
      // Widest page, not the first: fitting page 1 and then meeting a wider
      // page later leaves that one overflowing sideways with no warning.
      const naturalWidth = Math.max(...pageSizes.map(p => p.width));
      // Measured rather than hardcoded: the surface's padding is responsive
      // (tighter on phones to buy back reading width), so a fixed constant
      // here would silently disagree with it and mis-fit the page.
      const cs = getComputedStyle(containerRef.current!);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const available = containerRef.current!.clientWidth - pad;
      if (available > 0 && naturalWidth > 0) {
        // No MIN_SCALE floor here. Flooring the *fit* calculation was the
        // bug: on a ~280px phone viewport, available/naturalWidth lands
        // near 0.28, well under the 0.6 floor -- so the floor overrode the
        // fit and forced the page in at more than twice the width of the
        // screen on first render, every time, for every phone reader.
        // MAX_SCALE still applies, so a narrow PDF on a wide desktop
        // window doesn't blow up past a sane size.
        const fit = Math.min(MAX_SCALE, available / naturalWidth);
        fitScaleRef.current = fit;
        // Rounded DOWN to the step, not to the nearest one. Rounding to the
        // nearest could land above the true fit — a 390px phone computes a
        // fit of 0.625, which rounds up to 0.65 and renders the page ~15px
        // wider than the column it sits in, so every phone reader got a
        // stray horizontal scrollbar and a page they had to nudge sideways.
        // Flooring gives up at most one step of width and always fits.
        setScale(Math.max(0.05, Math.floor(fit * 20) / 20));
      }
      fitAppliedRef.current = true;
    })();
  }, [status, pageSizes]);

  /** Releases a page's pixels while leaving its placeholder in the layout. */
  const freePage = useCallback((n: number) => {
    // Bumped first: any render already past its own cancel point sees this
    // and drops out instead of re-inflating the canvas behind us.
    renderEpochsRef.current.set(n, (renderEpochsRef.current.get(n) ?? 0) + 1);
    renderTasksRef.current.get(n)?.cancel();
    renderTasksRef.current.delete(n);
    inFlightRef.current.delete(n);
    const canvas = canvasElsRef.current[n - 1];
    if (canvas) {
      // Zeroing the dimensions is what actually hands the memory back;
      // clearRect only paints over pixels the browser is still holding.
      canvas.width = 0;
      canvas.height = 0;
    }
    renderedAtRef.current.delete(n);
  }, []);

  // ── Draw one page ────────────────────────────────────────────────────────
  const renderPage = useCallback(async (n: number) => {
    const doc = pdfDocRef.current;
    const canvas = canvasElsRef.current[n - 1];
    if (!doc || !canvas) return;

    // A render already in flight for this page (a fast scroll, or a zoom
    // landing mid-draw) is abandoned rather than raced: two tasks on one
    // canvas interleave their output.
    renderTasksRef.current.get(n)?.cancel();
    inFlightRef.current.set(n, scale);
    const epoch = renderEpochsRef.current.get(n) ?? 0;
    const stale = () => (renderEpochsRef.current.get(n) ?? 0) !== epoch;
    setRenderingPages(prev => new Set(prev).add(n));

    try {
      const page = await doc.getPage(n);
      if (stale() || !wantedRef.current.has(n)) return;
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

      const task = page.render({ canvas, viewport: renderViewport });
      renderTasksRef.current.set(n, task);
      try {
        await task.promise;
      } catch (e: any) {
        if (e?.name === "RenderingCancelledException") return;
        throw e;
      }
      if (stale()) return;

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

      renderedAtRef.current.set(n, scale);

      // Scrolled away while this was drawing: hand the pixels straight back
      // rather than leaving a page nobody can see holding megabytes.
      if (!wantedRef.current.has(n)) {
        freePage(n);
        return;
      }

      // Background text extraction for search — cached per page, never
      // rendered as selectable DOM text.
      if (!pageTextsRef.current.has(n)) {
        try {
          const content = await page.getTextContent();
          pageTextsRef.current.set(n, content.items.map((it: any) => it.str ?? "").join(" "));
        } catch {
          // Search just won't find this page — not worth failing the view over.
        }
      }
    } catch (e) {
      console.error(`SecurePdfViewer: failed to render page ${n}`, e);
    } finally {
      renderTasksRef.current.delete(n);
      if (inFlightRef.current.get(n) === scale) inFlightRef.current.delete(n);
      setRenderingPages(prev => { const next = new Set(prev); next.delete(n); return next; });
    }
  }, [scale, watermarkText, freePage]);

  // ── Keep a window of pages drawn around whatever is on screen ────────────
  useEffect(() => {
    if (status !== "ready" || numPages === 0) return;

    const wanted = new Set<number>();
    for (const visible of visiblePages) {
      for (let d = -RENDER_WINDOW; d <= RENDER_WINDOW; d++) {
        const p = visible + d;
        if (p >= 1 && p <= numPages) wanted.add(p);
      }
    }

    wantedRef.current = wanted;

    // Pages still drawing count as held: cancelling them is the only way a
    // fast scroll doesn't leave a trail of finished renders behind it.
    const occupied = new Set([...renderedAtRef.current.keys(), ...inFlightRef.current.keys()]);
    for (const held of occupied) {
      if (!wanted.has(held)) freePage(held);
    }
    for (const p of wanted) {
      // Re-draw when the scale has moved: the canvas still holds a correct
      // image at the old zoom, which would otherwise be stretched by CSS
      // into a blurry one. Skip a page already being drawn at this very
      // scale, or pdfjs gets two render() calls on one canvas and fails.
      if (inFlightRef.current.get(p) === scale) continue;
      if (renderedAtRef.current.get(p) !== scale) void renderPage(p);
    }
  }, [visiblePages, scale, status, numPages, renderPage, freePage]);

  // ── Watch which pages are on screen ──────────────────────────────────────
  useEffect(() => {
    if (status !== "ready" || !containerRef.current || pageSizes.length === 0) return;

    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const n = Number((entry.target as HTMLElement).dataset.page);
        if (!n) continue;
        if (entry.isIntersecting) ratiosRef.current.set(n, entry.intersectionRatio);
        else ratiosRef.current.delete(n);
      }

      const seen = new Set(ratiosRef.current.keys());
      // Never empty: a document scrolled to a gap between observations
      // would otherwise free every page and show nothing at all.
      setVisiblePages(seen.size > 0 ? seen : new Set([pageNum]));

      // The reader's page is the one occupying most of the viewport, which
      // beats "the first one intersecting" — at the boundary between two
      // pages that would flip the indicator to the next page while nine
      // tenths of the previous one is still being read.
      let best = 0;
      let bestRatio = -1;
      for (const [n, ratio] of ratiosRef.current) {
        if (ratio > bestRatio) { bestRatio = ratio; best = n; }
      }
      // While a jump is in flight, only its destination may set the page —
      // otherwise the pages flying past on the way rewrite the indicator
      // and, with it, the saved reading position.
      const target = scrollingToRef.current;
      if (target !== null) {
        if (best === target) scrollingToRef.current = null;
        return;
      }
      if (best > 0) setPageNum(best);
    }, {
      root: containerRef.current,
      // Count pages just off screen as visible, so the next one is drawn
      // before it is scrolled into view rather than flashing blank.
      rootMargin: `${PREFETCH_MARGIN_PX}px 0px`,
      threshold: [0, 0.05, 0.25, 0.5, 0.75, 1],
    });

    pageElsRef.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pageSizes.length]);

  // ── Open at the remembered page, once ────────────────────────────────────
  useEffect(() => {
    if (status !== "ready" || openedAtRef.current || pageSizes.length === 0) return;
    // Waits for the fitted scale, not merely for the fit to have started:
    // the placeholders are sized from `scale`, so jumping to page 40 while
    // the default 1.1 is still in force scrolls to the offset page 40 would
    // have had at the wrong zoom — a PYQ reader resuming mid-paper would
    // land nowhere near where they left off.
    if (!fitAppliedRef.current) return;
    openedAtRef.current = true;
    if (initialPage > 1) {
      // Scrolled, then checked, then scrolled again. One frame is not
      // reliably enough: the placeholders have only just been re-sized by
      // the fitted scale, and a jump measured a frame too early lands
      // several pages short — a reader resuming at page 40 of a paper
      // arriving at page 30. Re-asserting until the element really is at
      // the top costs nothing and is exact.
      let attempts = 0;
      const settle = () => {
        const el = pageElsRef.current[initialPage - 1];
        const root = containerRef.current;
        if (!el || !root) return;
        scrollingToRef.current = initialPage;
        el.scrollIntoView({ block: "start" });
        const off = Math.abs(el.getBoundingClientRect().top - root.getBoundingClientRect().top);
        if (off > 4 && attempts++ < 5) requestAnimationFrame(settle);
      };
      requestAnimationFrame(settle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pageSizes.length, scale]);

  // ── Hold position through a zoom ─────────────────────────────────────────
  const zoomAnchorRef = useRef<number | null>(null);
  useEffect(() => {
    if (zoomAnchorRef.current === null) return;
    const anchor = zoomAnchorRef.current;
    zoomAnchorRef.current = null;
    // Every page changed height, so the old scroll offset now points
    // somewhere else entirely; re-anchor on the page being read.
    requestAnimationFrame(() => {
      scrollingToRef.current = anchor;
      pageElsRef.current[anchor - 1]?.scrollIntoView({ block: "start" });
    });
  }, [scale]);

  // ── Reading-progress callback, debounced ─────────────────────────────────
  useEffect(() => {
    if (status !== "ready" || !onPageChange || numPages === 0) return;
    const t = setTimeout(() => onPageChange(pageNum, numPages), PROGRESS_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [pageNum, numPages, status, onPageChange]);

  // Navigation is now a scroll, not a swap: the page is already in the
  // document, so "go to page 7" means put page 7 under the reader's eyes.
  const goToPage = useCallback((n: number) => {
    const target = Math.min(Math.max(1, n), numPages);
    if (!Number.isFinite(target)) return;
    setPageNum(target);
    scrollingToRef.current = target;
    pageElsRef.current[target - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [numPages]);

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
    if (matches.length > 0) goToPage(matches[0]);
  }, [numPages, goToPage]);

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

  const zoomIn = () => { zoomAnchorRef.current = pageNum; setScale(s => Math.min(MAX_SCALE, Math.round((s + SCALE_STEP) * 20) / 20)); };
  // Floors at whichever is smaller: the nominal minimum, or the scale that
  // fits the whole page width. A fixed MIN_SCALE floor here would fight the
  // fit calculation above on a narrow phone (fit-to-width sitting below
  // MIN_SCALE) by snapping the page BIGGER the moment "zoom out" is
  // pressed -- the opposite of what the button says it does.
  const zoomOut = () => { zoomAnchorRef.current = pageNum; setScale(s => Math.max(Math.min(MIN_SCALE, fitScaleRef.current), Math.round((s - SCALE_STEP) * 20) / 20)); };

  const currentMatchPos = matchPages.indexOf(pageNum);
  const jumpMatch = (dir: 1 | -1) => {
    if (matchPages.length === 0) return;
    const idx = currentMatchPos === -1 ? 0 : (currentMatchPos + dir + matchPages.length) % matchPages.length;
    goToPage(matchPages[idx]);
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
      {/* The canvas renders pixels only (deliberately — no selectable text
          layer), so narrate position changes for screen-reader users. */}
      <p className="sr-only" role="status">
        {status === "ready" ? `Page ${pageNum} of ${numPages}` : "Loading document"}
      </p>
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
                {/* Committed on Enter or blur rather than per keystroke:
                    typing "1" on the way to "12" used to scroll to page 1
                    and fight the reader for the box. */}
                <input
                  type="number"
                  defaultValue={pageNum}
                  key={pageNum}
                  min={1}
                  max={numPages}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      goToPage(Number((e.target as HTMLInputElement).value) || 1);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onBlur={e => goToPage(Number(e.target.value) || 1)}
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

        {/* On phones the search field hides behind a toggle and, when open,
            wraps to its own full-width row — it used to fight the page and
            zoom controls for one cramped line. */}
        <button
          onClick={() => setMobileSearchOpen(o => !o)}
          aria-label={mobileSearchOpen ? "Hide search" : "Search this paper"}
          aria-expanded={mobileSearchOpen}
          disabled={status !== "ready"}
          className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-30 sm:hidden"
        >
          <Search className="h-4 w-4" />
        </button>

        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <div className={`relative order-last basis-full sm:order-none sm:basis-auto sm:flex-1 sm:min-w-[160px] sm:max-w-xs ${mobileSearchOpen ? "" : "hidden sm:block"}`}>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => runSearch(e.target.value)}
            aria-label="Search this paper" placeholder="Search this paper…"
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
      {/* tabIndex makes the scroller focusable, which is what lets the
          browser's own arrow/space/PageDown handling drive it — no custom
          key bindings to collide with the copy-shortcut blocker below, and
          it gives keyboard readers a way in that the old page-at-a-time
          canvas never had. */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="document"
        aria-label="Document pages"
        onContextMenu={e => e.preventDefault()}
        className="relative max-h-[80vh] min-h-[420px] overflow-auto bg-slate-100 p-2 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 sm:p-4"
      >
        {status === "loading" && (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 py-16">
            <div className="aspect-[1/1.414] w-full animate-pulse rounded-md bg-slate-200" />
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading secure viewer…
            </p>
          </div>
        )}
        {status === "ready" && (
          // min-w-fit is load-bearing. The surface used to be the flex
          // container itself (flex + justify-center + overflow-auto), which
          // centres by splitting the overflow across both sides -- and
          // scrollLeft can't go below 0, so once a reader zoomed past the
          // container width the left edge of the page became unreachable.
          // Centring an inner column that is at least as wide as its content
          // keeps pages centred when they fit and scrollable to both
          // edges when they don't.
          <div className="flex min-w-fit flex-col items-center gap-3 sm:gap-4">
            {pageSizes.map((size, i) => {
              const n = i + 1;
              // The placeholder carries the page's real dimensions at the
              // current zoom, so freeing a page's pixels never changes the
              // document's height and the scrollbar stays put.
              const width = size.width * scale;
              const height = size.height * scale;
              return (
                <div
                  key={n}
                  ref={el => { pageElsRef.current[i] = el; }}
                  data-page={n}
                  // Clears the sticky toolbar when a page is scrolled to.
                  style={{ width, scrollMarginTop: 8 }}
                  className="relative shrink-0"
                >
                  <canvas
                    ref={el => { canvasElsRef.current[i] = el; }}
                    onDragStart={e => e.preventDefault()}
                    style={{ width, height }}
                    className="block rounded-sm bg-white shadow-md"
                  />
                  {renderingPages.has(n) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-accent-deep/70" />
                    </div>
                  )}
                  {/* A page number under each page: with every page in one
                      scroller there is otherwise nothing marking where one
                      ends and the next begins. */}
                  <span className="pointer-events-none absolute -bottom-0.5 right-1.5 rounded bg-slate-900/50 px-1.5 text-[10px] font-medium text-white">
                    {n}
                  </span>
                </div>
              );
            })}
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
