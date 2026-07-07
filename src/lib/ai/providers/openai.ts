import { postJSON } from "../http";
import type {
  AIProvider,
  CompleteOptions,
  CompletionResult,
  AIContentPart,
  EmbeddingProvider,
} from "../types";

interface OpenAIResponse {
  choices: { message: { content: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

function toOpenAIContent(parts: AIContentPart[]) {
  return parts.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    if (p.mediaType === "application/pdf") {
      return {
        type: "file",
        file: { filename: "document.pdf", file_data: `data:application/pdf;base64,${p.data}` },
      };
    }
    return {
      type: "image_url",
      image_url: { url: `data:${p.mediaType};base64,${p.data}` },
    };
  });
}

export function createOpenAIProvider(apiKey: string, model?: string): AIProvider {
  const resolvedModel = model ?? "gpt-4o-mini";

  return {
    id: "openai",
    defaultModel: resolvedModel,
    supportsVision: true,

    async complete(options: CompleteOptions): Promise<CompletionResult> {
      const messages: Record<string, unknown>[] = [];
      if (options.system) messages.push({ role: "system", content: options.system });
      for (const m of options.messages) {
        messages.push({ role: m.role, content: toOpenAIContent(m.content) });
      }

      const body: Record<string, unknown> = {
        model: resolvedModel,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.2,
        messages,
      };

      if (options.jsonSchema) {
        body.response_format = {
          type: "json_schema",
          json_schema: {
            name: options.jsonSchema.name,
            schema: options.jsonSchema.schema,
            strict: false,
          },
        };
      }

      const res = await postJSON<OpenAIResponse>(
        "openai",
        "https://api.openai.com/v1/chat/completions",
        { authorization: `Bearer ${apiKey}` },
        body,
      );

      const finish = res.choices[0]?.finish_reason;
      return {
        text: res.choices[0]?.message?.content ?? "",
        usage: res.usage
          ? { inputTokens: res.usage.prompt_tokens, outputTokens: res.usage.completion_tokens }
          : undefined,
        finishReason: finish === "length" ? "length" : finish === "stop" ? "stop" : "other",
      };
    },
  };
}

interface OpenAIEmbeddingResponse {
  data: { embedding: number[] }[];
}

export function createOpenAIEmbeddings(apiKey: string, model?: string): EmbeddingProvider {
  return {
    id: "openai",
    dimensions: 1536,
    async embed(texts: string[]): Promise<number[][]> {
      const res = await postJSON<OpenAIEmbeddingResponse>(
        "openai",
        "https://api.openai.com/v1/embeddings",
        { authorization: `Bearer ${apiKey}` },
        { model: model ?? "text-embedding-3-small", input: texts, dimensions: 1536 },
      );
      return res.data.map((d) => d.embedding);
    },
  };
}
