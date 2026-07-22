// Client-side resize/recompress for admin image uploads (cover photos,
// thumbnails, highlight images). Every image currently ships to Supabase
// Storage at whatever raw resolution/format the admin's phone or browser
// produced — this keeps page weight sane as the content library grows,
// without needing a server-side image pipeline.
const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File, maxDimension = MAX_DIMENSION, quality = QUALITY): Promise<File> {
  // Nothing to gain on formats a canvas re-encode would just bloat or break.
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // unsupported/corrupt image — let the original upload proceed

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
  if (!blob || blob.size >= file.size) return file; // re-encode didn't help — keep the original

  const ext = outputType === "image/png" ? "png" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;
  return new File([blob], name, { type: outputType });
}
