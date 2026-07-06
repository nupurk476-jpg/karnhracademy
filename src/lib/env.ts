import { z } from "zod";

/**
 * Central, validated view of runtime configuration.
 * Server-only values are read lazily so client bundles never touch them.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
});

export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return parsed.data;
}

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
});

export function serverEnv() {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required on the server for ingestion and admin operations.",
    );
  }
  return parsed.data;
}

export type AIProviderId = "anthropic" | "openai" | "gemini";
export type EmbeddingProviderId = "openai" | "gemini" | "none";

export function aiEnv() {
  const provider = (process.env.AI_PROVIDER ?? "anthropic") as AIProviderId;
  const embeddingProvider = (process.env.EMBEDDING_PROVIDER ??
    (process.env.OPENAI_API_KEY ? "openai" : process.env.GOOGLE_AI_API_KEY ? "gemini" : "none")) as EmbeddingProviderId;

  return {
    provider,
    model: process.env.AI_MODEL || undefined,
    embeddingProvider,
    embeddingModel: process.env.EMBEDDING_MODEL || undefined,
    anthropicKey: process.env.ANTHROPIC_API_KEY || undefined,
    openaiKey: process.env.OPENAI_API_KEY || undefined,
    geminiKey: process.env.GOOGLE_AI_API_KEY || undefined,
  };
}
