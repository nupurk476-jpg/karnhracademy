// Auto-generates a blog post's cover image at import time, so an admin
// pasting in a Claude-generated HTML article never has to design or upload
// a cover by hand.
//
// These HTML articles don't contain a photo — the "cover" is a styled hero
// banner (custom gradient, decorative shapes, the title in a display font).
// Primary strategy: re-render that exact hero off-screen with its original
// CSS and rasterize it with html2canvas, so the generated cover is a pixel
// match for the banner the admin actually designed.
//
// If that fails for any reason (unsupported CSS, missing fonts, a hero the
// parser couldn't find), fall back to a simple canvas-drawn cover in the
// site's own brand palette — always succeeds, never blocks the import.

const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630; // standard OG/social image size — also used as og:image

const NAVY = "#1F4E79";
const NAVY_DARK = "#0D2A45";
const GOLD = "#C7994A";

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))), "image/png", 0.92);
  });
}

// Loads each stylesheet <link> (typically Google Fonts) so the hero's
// intended typeface is available before we snapshot it. Best-effort: a slow
// or blocked font load is timed out rather than stalling the import.
async function preloadFonts(hrefs: string[]): Promise<HTMLLinkElement[]> {
  const existing = new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute("href")));
  const links: HTMLLinkElement[] = [];
  const loads: Promise<void>[] = [];

  for (const href of hrefs) {
    if (existing.has(href)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    links.push(link);
    loads.push(new Promise(resolve => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
      setTimeout(resolve, 2000);
    }));
  }

  await Promise.all(loads);
  if ("fonts" in document) {
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
  }
  return links;
}

async function rasterizeHero(heroHtml: string, heroCss: string, fontHrefs: string[]): Promise<Blob> {
  const addedFontLinks = await preloadFonts(fontHrefs);

  const container = document.createElement("div");
  container.style.cssText = `position:fixed; left:-99999px; top:0; width:${COVER_WIDTH}px; height:${COVER_HEIGHT}px; overflow:hidden;`;
  container.innerHTML = `<style>${heroCss}</style>${heroHtml}`;
  document.body.appendChild(container);

  try {
    // Let the browser apply layout/fonts for a frame before snapshotting.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(container, {
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
      scale: 1,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const blob = await canvasToPngBlob(canvas);
    if (blob.size < 1000) throw new Error("Rasterized cover looks blank");
    return blob;
  } finally {
    container.remove();
    addedFontLinks.forEach(l => l.remove());
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function drawFallbackCover(title: string, category: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const gradient = ctx.createLinearGradient(0, 0, COVER_WIDTH, COVER_HEIGHT);
  gradient.addColorStop(0, NAVY);
  gradient.addColorStop(1, NAVY_DARK);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

  // Decorative diamonds, echoing the site's brand mark.
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  ctx.translate(COVER_WIDTH - 120, 100);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-90, -90, 180, 180);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = GOLD;
  ctx.translate(COVER_WIDTH - 220, 260);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-45, -45, 90, 90);
  ctx.restore();

  ctx.fillStyle = GOLD;
  ctx.font = "700 22px 'Sora', sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(category.toUpperCase(), 80, 140);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 56px 'Sora', sans-serif";
  const lines = wrapText(ctx, title, COVER_WIDTH - 160).slice(0, 3);
  let y = 240;
  for (const line of lines) {
    ctx.fillText(line, 80, y);
    y += 68;
  }

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "600 20px 'Sora', sans-serif";
  ctx.fillText("Karn HR Academy", 80, COVER_HEIGHT - 60);

  return canvasToPngBlob(canvas);
}

export async function generateCoverImage(parsed: {
  title: string;
  category: string;
  heroHtml: string | null;
  heroCss: string;
  fontHrefs: string[];
}): Promise<Blob> {
  if (parsed.heroHtml) {
    try {
      return await rasterizeHero(parsed.heroHtml, parsed.heroCss, parsed.fontHrefs);
    } catch (err) {
      console.warn("Hero rasterization failed, using fallback cover:", err);
    }
  }
  return drawFallbackCover(parsed.title, parsed.category);
}
