export type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

// Lazy-loaded once per app session — pdfjs is heavy, and most visitors never
// open a PDF, so this only pays its cost when someone actually does. Shared
// by the full reader (SecurePdfViewer) and the download-gate preview, so a
// visitor who uses both downloads it once.
let pdfjsPromise: Promise<PdfjsModule> | null = null;
export function loadPdfjs(): Promise<PdfjsModule> {
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

/**
 * Fetches a PDF into memory and opens it. The URL is only ever fetched —
 * it never lands in an <a>, an <iframe src>, or the address bar.
 */
export async function openPdf(fileUrl: string) {
  const pdfjs = await loadPdfjs();
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const bytes = await res.arrayBuffer();
  return pdfjs.getDocument({
    data: bytes,
    // Scanned exam papers are frequently JBIG2/JPX-compressed; without
    // this, pdfjs silently fails to decode those images (and, since
    // that failure happens mid-render, everything drawn after it on
    // the same canvas — including a watermark — never lands either).
    wasmUrl: "/pdfjs-wasm/",
  }).promise;
}
