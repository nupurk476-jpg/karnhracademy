import type { Metadata } from "next";
import { listLinkableDocuments } from "@/lib/actions/upload";
import { UploadCenter } from "./upload-center";

export const metadata: Metadata = { title: "Upload Center" };

export default async function UploadPage() {
  const linkable = await listLinkableDocuments();

  return (
    <div className="container max-w-3xl animate-fade-in-up space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Center</h1>
        <p className="text-sm text-muted-foreground">
          Drop in question papers, banks, or answer keys — messy formatting is fine. The AI
          pipeline extracts what exists and flags what&apos;s missing; nothing is published
          without your review.
        </p>
      </div>
      <UploadCenter linkableDocuments={linkable.ok ? linkable.data : []} />
    </div>
  );
}
