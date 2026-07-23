import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

// Stamps a light, non-obstructive footer + a faint diagonal mark on every
// page of an uploaded PDF before it goes to storage — a basic deterrent
// against casual redistribution and a branding reinforcement, not real DRM
// (a screenshot or a determined re-export can still strip it). Only PDFs
// can be watermarked this way; PPT/PPTX notes are left untouched.
// Fails soft: an encrypted/corrupt/unreadable PDF just uploads unwatermarked
// rather than blocking the admin's upload.
export async function watermarkPdf(file: File, label = "karnhracademy.com — do not redistribute"): Promise<File> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return file;

  try {
    const bytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const footerSize = 8;
      page.drawText(label, {
        x: 24,
        y: 16,
        size: footerSize,
        font,
        color: rgb(0.55, 0.55, 0.55),
        opacity: 0.6,
      });
      // Faint diagonal center mark — visible enough to discourage a quick
      // re-share, subtle enough not to obstruct reading the content.
      const diagText = "KARN HR ACADEMY";
      const diagSize = 42;
      const textWidth = font.widthOfTextAtSize(diagText, diagSize);
      page.drawText(diagText, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: diagSize,
        font,
        color: rgb(0.6, 0.6, 0.6),
        opacity: 0.08,
        rotate: degrees(35),
      });
    }

    const watermarked = await pdfDoc.save();
    return new File([watermarked], file.name, { type: "application/pdf" });
  } catch (e) {
    console.error("watermarkPdf failed, uploading original file", e);
    return file;
  }
}
