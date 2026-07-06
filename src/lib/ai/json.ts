import { z } from "zod";
import type { AIProvider, CompleteOptions } from "./types";
import { AIProviderError } from "./types";

/**
 * Structured extraction with validation + one self-repair retry.
 * Works with any provider: native structured output where supported,
 * with tolerant JSON recovery as a safety net.
 */
export async function completeJSON<T>(
  provider: AIProvider,
  options: CompleteOptions & { jsonSchema: NonNullable<CompleteOptions["jsonSchema"]> },
  validator: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T> {
  const first = await provider.complete(options);
  const attempt1 = tryParse(first.text, validator);
  if (attempt1.success) return attempt1.data;

  // One repair round: show the model its own output and the validation error.
  const repair = await provider.complete({
    ...options,
    messages: [
      ...options.messages,
      { role: "assistant", content: [{ type: "text", text: first.text.slice(0, 8000) }] },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Your previous response was not valid. Validation error: ${attempt1.error}. Respond again with ONLY valid JSON matching the schema.`,
          },
        ],
      },
    ],
  });

  const attempt2 = tryParse(repair.text, validator);
  if (attempt2.success) return attempt2.data;

  throw new AIProviderError(
    provider.id,
    `structured output failed validation after retry: ${attempt2.error}`,
  );
}

function tryParse<T>(
  text: string,
  validator: z.ZodType<T, z.ZodTypeDef, unknown>,
): { success: true; data: T } | { success: false; error: string } {
  const candidate = extractJSONBlock(text);
  if (candidate === null) return { success: false, error: "no JSON found in response" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    return { success: false, error: `invalid JSON: ${(e as Error).message}` };
  }

  const result = validator.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 5).join("; ") };
  }
  return { success: true, data: result.data };
}

/** Pull the first JSON object/array out of a response that may include prose or fences. */
export function extractJSONBlock(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1].trim() : trimmed;

  if (body.startsWith("{") || body.startsWith("[")) return body;

  const start = body.search(/[[{]/);
  if (start === -1) return null;

  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return body.slice(start, i + 1);
    }
  }
  return null;
}
