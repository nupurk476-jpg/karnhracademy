/**
 * Provider-agnostic AI abstraction. Business logic (ingestion, explanations,
 * classification) depends only on these interfaces — swap Claude, OpenAI,
 * Gemini or any future provider by adding an adapter and setting AI_PROVIDER.
 */

export interface AITextPart {
  type: "text";
  text: string;
}

/** Binary attachment for multimodal calls (vision OCR of images / PDFs). */
export interface AIFilePart {
  type: "file";
  mediaType: string; // e.g. "application/pdf", "image/png"
  data: string; // base64
}

export type AIContentPart = AITextPart | AIFilePart;

export interface AIMessage {
  role: "user" | "assistant";
  content: AIContentPart[];
}

export interface CompleteOptions {
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /**
   * When set, the provider is asked (natively where supported) to return JSON
   * matching this schema. The caller still validates the parsed result.
   */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

export interface CompletionResult {
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
  /** "length" means the output hit maxTokens and is likely truncated. */
  finishReason?: "stop" | "length" | "other";
}

export interface AIProvider {
  readonly id: string;
  readonly defaultModel: string;
  readonly supportsVision: boolean;
  complete(options: CompleteOptions): Promise<CompletionResult>;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export class AIProviderError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(provider: string, message: string, status?: number) {
    super(`[${provider}] ${message}`);
    this.name = "AIProviderError";
    this.provider = provider;
    this.status = status;
    this.retryable = status === 429 || (status !== undefined && status >= 500);
  }
}
