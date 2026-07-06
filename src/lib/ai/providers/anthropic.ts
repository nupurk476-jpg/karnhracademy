import { postJSON } from "../http";
import type { AIProvider, CompleteOptions, CompletionResult, AIContentPart } from "../types";

interface AnthropicContentBlock {
  type: string;
  text?: string;
  input?: unknown;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
}

function toAnthropicContent(parts: AIContentPart[]) {
  return parts.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    if (p.mediaType === "application/pdf") {
      return {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: p.data },
      };
    }
    return {
      type: "image",
      source: { type: "base64", media_type: p.mediaType, data: p.data },
    };
  });
}

export function createAnthropicProvider(apiKey: string, model?: string): AIProvider {
  const resolvedModel = model ?? "claude-sonnet-4-5";

  return {
    id: "anthropic",
    defaultModel: resolvedModel,
    supportsVision: true,

    async complete(options: CompleteOptions): Promise<CompletionResult> {
      const useTool = Boolean(options.jsonSchema);

      const body: Record<string, unknown> = {
        model: resolvedModel,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.2,
        system: options.system,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: toAnthropicContent(m.content),
        })),
      };

      if (useTool && options.jsonSchema) {
        // Forced tool use is Anthropic's native structured-output mechanism.
        body.tools = [
          {
            name: options.jsonSchema.name,
            description: "Return the structured result.",
            input_schema: options.jsonSchema.schema,
          },
        ];
        body.tool_choice = { type: "tool", name: options.jsonSchema.name };
      }

      const res = await postJSON<AnthropicResponse>(
        "anthropic",
        "https://api.anthropic.com/v1/messages",
        { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body,
      );

      let text = "";
      if (useTool) {
        const toolBlock = res.content.find((b) => b.type === "tool_use");
        text = toolBlock ? JSON.stringify(toolBlock.input) : "";
      }
      if (!text) {
        text = res.content
          .filter((b) => b.type === "text" && b.text)
          .map((b) => b.text)
          .join("\n");
      }

      return {
        text,
        usage: res.usage
          ? { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens }
          : undefined,
      };
    },
  };
}
