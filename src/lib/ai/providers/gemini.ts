import { postJSON } from "../http";
import type {
  AIProvider,
  CompleteOptions,
  CompletionResult,
  AIContentPart,
  EmbeddingProvider,
} from "../types";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

function toGeminiParts(parts: AIContentPart[]) {
  return parts.map((p) =>
    p.type === "text"
      ? { text: p.text }
      : { inline_data: { mime_type: p.mediaType, data: p.data } },
  );
}

/**
 * Gemini's responseSchema is OpenAPI-style, not JSON Schema: `type` must be a
 * single string (nullability is a separate `nullable` flag) and `enum` cannot
 * contain null. Convert both so shared schemas work across providers.
 */
export function sanitizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === "additionalProperties" || k === "$schema") continue;

      if (k === "type" && Array.isArray(v)) {
        const nonNull = v.filter((t) => t !== "null");
        out.type = nonNull[0] ?? "string";
        if (nonNull.length !== v.length) out.nullable = true;
        continue;
      }

      if (k === "enum" && Array.isArray(v)) {
        const nonNull = v.filter((e) => e !== null);
        out.enum = nonNull;
        if (nonNull.length !== v.length) out.nullable = true;
        continue;
      }

      out[k] = sanitizeSchema(v);
    }
    return out;
  }
  return schema;
}

export function createGeminiProvider(apiKey: string, model?: string): AIProvider {
  const resolvedModel = model ?? "gemini-2.0-flash";

  return {
    id: "gemini",
    defaultModel: resolvedModel,
    supportsVision: true,

    async complete(options: CompleteOptions): Promise<CompletionResult> {
      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.2,
      };
      if (options.jsonSchema) {
        generationConfig.responseMimeType = "application/json";
        generationConfig.responseSchema = sanitizeSchema(options.jsonSchema.schema);
      }

      const res = await postJSON<GeminiResponse>(
        "gemini",
        `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`,
        {},
        {
          system_instruction: options.system
            ? { parts: [{ text: options.system }] }
            : undefined,
          contents: options.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: toGeminiParts(m.content),
          })),
          generationConfig,
        },
      );

      const text =
        res.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("") ?? "";

      const finish = res.candidates?.[0]?.finishReason;
      return {
        text,
        usage: res.usageMetadata
          ? {
              inputTokens: res.usageMetadata.promptTokenCount ?? 0,
              outputTokens: res.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined,
        finishReason:
          finish === "MAX_TOKENS" ? "length" : finish === "STOP" ? "stop" : "other",
      };
    },
  };
}

interface GeminiEmbeddingResponse {
  embeddings: { values: number[] }[];
}

export function createGeminiEmbeddings(apiKey: string, model?: string): EmbeddingProvider {
  const resolvedModel = model ?? "gemini-embedding-001";
  return {
    id: "gemini",
    dimensions: 1536,
    async embed(texts: string[]): Promise<number[][]> {
      const res = await postJSON<GeminiEmbeddingResponse>(
        "gemini",
        `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:batchEmbedContents?key=${apiKey}`,
        {},
        {
          requests: texts.map((t) => ({
            model: `models/${resolvedModel}`,
            content: { parts: [{ text: t }] },
            outputDimensionality: 1536,
          })),
        },
      );
      return res.embeddings.map((e) => e.values);
    },
  };
}
