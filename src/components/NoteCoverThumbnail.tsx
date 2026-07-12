import { useEffect, useRef, useState } from "react";
import { Presentation } from "lucide-react";
import { subjectGradient } from "@/lib/subjectGradients";

// Renders page 1 of a note's PDF as a cover image, so visitors can see what's
// inside before the email gate. pdfjs is heavy, so it's dynamically imported
// and only rendered once a card actually scrolls into view; results are
// cached by URL since the same note can appear on both the homepage and the
// Notes page in one session.
const coverCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

async function renderPdfCover(url: string): Promise<string> {
  if (coverCache.has(url)) return coverCache.get(url)!;
  if (inflight.has(url)) return inflight.get(url)!;
  const job = (async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ url }).promise;
    const page = await doc.getPage(1);
    const targetWidth = 420;
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    coverCache.set(url, dataUrl);
    return dataUrl;
  })();
  inflight.set(url, job);
  try {
    return await job;
  } finally {
    inflight.delete(url);
  }
}

// Designed cover for PPT/PPTX notes — a PowerPoint file can't be rasterized
// in-browser the way a PDF's first page can, so instead of a bland "no
// preview" box this renders a subject-tinted gradient poster (same visual
// language as the quiz cards) with a slide-deck icon and the note's title.
const PptCoverArt = ({ subject, title, size }: { subject?: string | null; title: string; size: "sm" | "lg" }) => {
  const [from, to] = subjectGradient(subject);
  if (size === "sm") {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <Presentation className="h-5 w-5 text-white/90" strokeWidth={1.75} />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className="absolute -right-5 -top-5 h-20 w-20 rotate-45 rounded-lg bg-white/10" />
      <div className="absolute right-10 top-16 h-8 w-8 rotate-45 rounded bg-white/15" />
      <Presentation className="absolute -bottom-5 -right-5 h-28 w-28 text-white/10" strokeWidth={1.5} />
      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
          <Presentation className="h-3 w-3" /> PPT
        </span>
        <h3 className="text-sm font-bold leading-snug text-white line-clamp-3" style={{ fontFamily: "'Sora',sans-serif" }}>
          {title}
        </h3>
      </div>
    </div>
  );
};

type Props = {
  fileUrl?: string | null;
  title: string;
  /** Discipline value (e.g. "hrm", "ob") — picks the PPT cover's gradient. */
  subject?: string | null;
  /** "sm" for tiny list-row thumbnails, "lg" for full cards. Defaults to "lg". */
  size?: "sm" | "lg";
  /** Sizing/rounding/overflow for the cover box. */
  className?: string;
  /** Shown while a PDF cover is loading, and for render failures or unrecognized file types. */
  children?: React.ReactNode;
};

const NoteCoverThumbnail = ({ fileUrl, title, subject, size = "lg", className, children }: Props) => {
  const isPdf = !!fileUrl && /\.pdf(\?|$)/i.test(fileUrl);
  const isPpt = !!fileUrl && /\.pptx?(\?|$)/i.test(fileUrl);
  const [src, setSrc] = useState<string | null>(isPdf ? coverCache.get(fileUrl!) ?? null : null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !isPdf) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isPdf]);

  useEffect(() => {
    if (!visible || !isPdf || !fileUrl || src || failed) return;
    let cancelled = false;
    renderPdfCover(fileUrl)
      .then((dataUrl) => { if (!cancelled) setSrc(dataUrl); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [visible, isPdf, fileUrl, src, failed]);

  return (
    <div ref={ref} className={className}>
      {isPdf && src ? (
        <img
          src={src}
          alt={`Cover page of ${title}`}
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
      ) : isPpt ? (
        <PptCoverArt subject={subject} title={title} size={size} />
      ) : (
        children
      )}
    </div>
  );
};

export default NoteCoverThumbnail;
