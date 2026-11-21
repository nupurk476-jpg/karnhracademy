import { supabase } from "@/integrations/supabase/client";

// The `notes` and `pyq-papers` buckets are private (see the
// private_download_buckets migration) — file_url in the database is a
// stored *public-style* URL (getPublicUrl's shape) from when the bucket
// was public, but that path no longer serves anything directly. This
// extracts the object path back out of that stored URL and exchanges it
// for a short-lived signed URL at open/download time, so a captured link
// can't be shared and reused forever.
const SIGNED_URL_TTL_SECONDS = 120;

function extractStoragePath(fileUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = fileUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(fileUrl.slice(i + marker.length));
}

// Falls back to the original fileUrl on any failure (bucket somehow still
// public, a row predating this scheme, a transient network error) — a
// working-but-unprotected link beats a broken download button.
export async function getSignedFileUrl(
  fileUrl: string | null | undefined,
  bucket: "notes" | "pyq-papers",
  download = false,
): Promise<string | null> {
  if (!fileUrl) return null;
  const path = extractStoragePath(fileUrl, bucket);
  if (!path) return fileUrl;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, download ? { download: true } : undefined);
  if (error || !data?.signedUrl) {
    // A paid note the visitor hasn't bought: storage refuses to sign it
    // (see the razorpay_payments migration). Every listing page funnels
    // through here, so this is the one place that can send them to the
    // note's page, which shows the price and a Buy button, instead of a
    // download that silently does nothing.
    if (bucket === "notes") {
      const { data: locked } = await (supabase.from("notes") as any)
        .select("id").eq("file_path", path).eq("is_free", false).limit(1);
      if (locked?.[0]?.id) {
        window.location.assign(`/notes/view/${locked[0].id}`);
        return null;
      }
    }
    console.error("getSignedFileUrl failed, falling back to stored URL", error);
    return fileUrl;
  }
  return data.signedUrl;
}

// Whether a stored file URL points at a PDF (vs .ppt/.pptx and friends,
// which browsers can't render inline and the in-app viewer can't open).
export function isPdfFile(url: string | null | undefined): boolean {
  return !!url && url.split("?")[0].toLowerCase().endsWith(".pdf");
}
