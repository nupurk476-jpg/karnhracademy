// Auto-fills a lecture's title, description and thumbnail from a pasted
// YouTube link, so admins don't have to retype what's already on YouTube.
//
// Title + thumbnail come from YouTube's public oEmbed endpoint — no API key,
// works for any public/unlisted video, and is the same mechanism most sites
// use for "paste a link, get a preview" (Slack, Twitter, etc.).
//
// oEmbed does not expose the video description (YouTube only returns that
// via the Data API v3, which requires a key). If VITE_YOUTUBE_API_KEY is
// configured, we use it for a richer fetch (title + real description +
// highest-res thumbnail in one call); otherwise description is left for the
// admin to fill in by hand. Restrict the key to your site's HTTP referrer in
// Google Cloud Console before using it in a public admin panel.

export type YouTubeMetadata = {
  videoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string;
};

// Lectures saved before this fix may have hqdefault.jpg stored as their
// thumbnail — a destructive 4:3 center crop of the original 16:9 frame that
// chops the edges off a custom thumbnail design. Rewrite it to mqdefault.jpg
// (the uncropped 16:9 version) at display time, so already-saved lectures
// self-heal without an admin having to re-fetch and re-save each one.
export function normalizeYouTubeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/\/hqdefault\.jpg(\?.*)?$/, "/mqdefault.jpg$1");
}

const ID_PATTERNS = [
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
  /youtube\.com\/shorts\/([\w-]{11})/,
  /youtube\.com\/live\/([\w-]{11})/,
];

export function extractYouTubeId(url: string): string | null {
  for (const pattern of ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// maxresdefault.jpg is the largest thumbnail YouTube serves (the custom
// "clickbait" image creators upload) but 404s for videos that never had one
// generated (older or vertical videos) — probe it via Image() and fall back
// to mqdefault.jpg (320x180, true 16:9, always exists). NOT hqdefault.jpg:
// that one is a destructive 4:3 CENTER CROP of the original 16:9 frame, so
// it chops the left/right edges off any custom thumbnail — exactly the
// "only a sliver of the real thumbnail shows" bug this avoids.
function resolveBestThumbnail(videoId: string): Promise<string> {
  const maxres = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const fallback = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  return new Promise((resolve) => {
    const probe = new Image();
    // YouTube's placeholder for a missing maxresdefault is a tiny grey image
    // (120x90); a real thumbnail is always much larger.
    probe.onload = () => resolve(probe.naturalWidth > 120 ? maxres : fallback);
    probe.onerror = () => resolve(fallback);
    probe.src = maxres;
  });
}

async function fetchOEmbed(videoId: string): Promise<{ title: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { title: data.title as string };
  } catch {
    return null;
  }
}

// First paragraph or ~300 characters, whichever is shorter — a raw YouTube
// description is often a wall of hashtags/subscribe links unsuited to a
// lecture card; the admin can always expand or rewrite it after fetching.
function trimDescription(raw: string): string {
  const firstParagraph = raw.split(/\n\s*\n/)[0].trim();
  const base = firstParagraph.length > 10 ? firstParagraph : raw.trim();
  return base.length > 300 ? base.slice(0, 297).trimEnd() + "…" : base;
}

async function fetchDataApiDetails(videoId: string): Promise<{ title: string; description: string } | null> {
  const key = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${key}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const snippet = data.items?.[0]?.snippet;
    if (!snippet) return null;
    return { title: snippet.title as string, description: trimDescription(snippet.description ?? "") };
  } catch {
    return null;
  }
}

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  const [details, thumbnailUrl] = await Promise.all([
    fetchDataApiDetails(videoId),
    resolveBestThumbnail(videoId),
  ]);

  if (details) {
    return { videoId, title: details.title, description: details.description, thumbnailUrl };
  }

  const oembed = await fetchOEmbed(videoId);
  if (!oembed) return null;
  return { videoId, title: oembed.title, description: null, thumbnailUrl };
}
