import { describe, it, expect } from "vitest";
import { sanitizeSchema } from "../providers/gemini";

/**
 * Gemini's responseSchema is OpenAPI-style: single `type` string + `nullable`
 * flag, no null enum members, no additionalProperties. The shared JSON
 * schemas (used verbatim by Anthropic/OpenAI) must convert cleanly.
 */
describe("sanitizeSchema (gemini)", () => {
  it("converts nullable type arrays to type + nullable", () => {
    expect(sanitizeSchema({ type: ["integer", "null"] })).toEqual({
      type: "integer",
      nullable: true,
    });
  });

  it("keeps plain types untouched", () => {
    expect(sanitizeSchema({ type: "string" })).toEqual({ type: "string" });
  });

  it("strips null from enums and marks nullable", () => {
    expect(
      sanitizeSchema({ type: ["string", "null"], enum: ["easy", "medium", "hard", null] }),
    ).toEqual({ type: "string", nullable: true, enum: ["easy", "medium", "hard"] });
  });

  it("removes additionalProperties and $schema recursively", () => {
    const result = sanitizeSchema({
      type: "object",
      additionalProperties: false,
      $schema: "x",
      properties: {
        nested: { type: "object", additionalProperties: false, properties: {} },
      },
    }) as Record<string, unknown>;
    expect(result).not.toHaveProperty("additionalProperties");
    expect(result).not.toHaveProperty("$schema");
    expect((result.properties as Record<string, Record<string, unknown>>).nested).not.toHaveProperty(
      "additionalProperties",
    );
  });

  it("handles the real extraction schema shape end to end", () => {
    const input = {
      type: "object",
      additionalProperties: false,
      required: ["questions"],
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              number: { type: ["integer", "null"] },
              options: {
                type: ["array", "null"],
                items: { type: "object", properties: { key: { type: "string" } } },
              },
              difficulty: { type: ["string", "null"], enum: ["easy", "medium", "hard", null] },
            },
          },
        },
      },
    };
    const out = JSON.stringify(sanitizeSchema(input));
    expect(out).not.toContain("additionalProperties");
    // No JSON-Schema null tokens may remain ("nullable" flags are fine).
    expect(out).not.toContain('"null"');
    expect(out).not.toContain(",null");
    expect(out).toContain('"nullable":true');
  });
});
