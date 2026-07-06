import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "exceljs", "pdf-lib"],
  experimental: {
    serverActions: {
      // Uploads go directly to Supabase Storage via signed URLs;
      // server actions only carry metadata, so keep this conservative.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
