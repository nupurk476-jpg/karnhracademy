import "server-only";
import { aiEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { createAnthropicProvider } from "./providers/anthropic";
import { createOpenAIProvider, createOpenAIEmbeddings } from "./providers/openai";
import { createGeminiProvider, createGeminiEmbeddings } from "./providers/gemini";
import type { AIProvider, EmbeddingProvider } from "./types";

/**
 * Provider registry. Business logic calls getAIProvider()/getEmbeddings() and
 * never touches vendor SDKs or endpoints directly.
 */

export function getAIProvider(): AIProvider {
  const env = aiEnv();

  switch (env.provider) {
    case "anthropic":
      if (!env.anthropicKey) throw missingKey("ANTHROPIC_API_KEY");
      return createAnthropicProvider(env.anthropicKey, env.model);
    case "openai":
      if (!env.openaiKey) throw missingKey("OPENAI_API_KEY");
      return createOpenAIProvider(env.openaiKey, env.model);
    case "gemini":
      if (!env.geminiKey) throw missingKey("GOOGLE_AI_API_KEY");
      return createGeminiProvider(env.geminiKey, env.model);
    default:
      throw new AppError("ai_unavailable", `Unknown AI_PROVIDER "${env.provider}".`);
  }
}

/** Returns null when embeddings are not configured — callers must degrade gracefully. */
export function getEmbeddings(): EmbeddingProvider | null {
  const env = aiEnv();

  switch (env.embeddingProvider) {
    case "openai":
      return env.openaiKey ? createOpenAIEmbeddings(env.openaiKey, env.embeddingModel) : null;
    case "gemini":
      return env.geminiKey ? createGeminiEmbeddings(env.geminiKey, env.embeddingModel) : null;
    default:
      return null;
  }
}

export function isAIConfigured(): boolean {
  try {
    getAIProvider();
    return true;
  } catch {
    return false;
  }
}

function missingKey(name: string) {
  return new AppError(
    "ai_unavailable",
    `AI provider is not configured: set ${name} in your environment.`,
  );
}
