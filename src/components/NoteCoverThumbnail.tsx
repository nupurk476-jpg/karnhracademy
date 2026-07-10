import { useEffect, useRef, useState } from "react";

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
    await page.render({ canvasContext: ctx, viewport }).promise;
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

type Props = {
  fileUrl?: string | null;
  title: string;
  /** Sizing/rounding/overflow for the cover box. */
  className?: string;
  /** Shown while the cover is loading, and permanently for non-PDF files or render failures. */
  children?: React.ReactNode;
};

const NoteCoverThumbnail = ({ fileUrl, title, className, children }: Props) => {
  const isPdf = !!fileUrl && /\.pdf(\?|$)/i.test(fileUrl);
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
      ) : (
        children
      )}
    </div>
  );
};

export default NoteCoverThumbnail;
