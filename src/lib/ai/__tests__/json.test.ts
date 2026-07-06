import { describe, it, expect } from "vitest";
import { z } from "zod";
import { extractJSONBlock, completeJSON } from "../json";
import type { AIProvider, CompleteOptions } from "../types";

describe("extractJSONBlock", () => {
  it("passes through clean JSON", () => {
    expect(extractJSONBlock('{"a":1}')).toBe('{"a":1}');
  });

  it("unwraps markdown fences", () => {
    expect(extractJSONBlock('```json\n{"a": 1}\n```')).toBe('{"a": 1}');
  });

  it("extracts JSON embedded in prose", () => {
    const text = 'Here is the result: {"questions": [{"n": 1}]} — hope that helps!';
    expect(extractJSONBlock(text)).toBe('{"questions": [{"n": 1}]}');
  });

  it("handles braces inside strings", () => {
    const text = 'prefix {"stem": "What does { mean in C?"} suffix';
    expect(JSON.parse(extractJSONBlock(text)!)).toEqual({ stem: "What does { mean in C?" });
  });

  it("returns null for non-JSON", () => {
    expect(extractJSONBlock("no json here")).toBeNull();
    expect(extractJSONBlock("")).toBeNull();
  });
});

const schema = z.object({ value: z.number() });

function mockProvider(responses: string[]): AIProvider & { calls: CompleteOptions[] } {
  const calls: CompleteOptions[] = [];
  return {
    id: "mock",
    defaultModel: "mock-1",
    supportsVision: false,
    calls,
    async complete(options: CompleteOptions) {
      calls.push(options);
      const text = responses[Math.min(calls.length - 1, responses.length - 1)];
      return { text };
    },
  };
}

describe("completeJSON", () => {
  const baseOptions = {
    messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "go" }] }],
    jsonSchema: { name: "test", schema: { type: "object" } },
  };

  it("returns validated data on first try", async () => {
    const provider = mockProvider(['{"value": 42}']);
    const result = await completeJSON(provider, baseOptions, schema);
    expect(result).toEqual({ value: 42 });
    expect(provider.calls).toHaveLength(1);
  });

  it("self-repairs after an invalid first response", async () => {
    const provider = mockProvider(["oops not json", '{"value": 7}']);
    const result = await completeJSON(provider, baseOptions, schema);
    expect(result).toEqual({ value: 7 });
    expect(provider.calls).toHaveLength(2);
    // The repair prompt should include the validation feedback.
    const repairText = (provider.calls[1].messages.at(-1)?.content[0] as { text: string }).text;
    expect(repairText).toContain("not valid");
  });

  it("throws after two failed attempts", async () => {
    const provider = mockProvider(["bad", "still bad"]);
    await expect(completeJSON(provider, baseOptions, schema)).rejects.toThrow(/validation/);
  });

  it("rejects schema-mismatched JSON", async () => {
    const provider = mockProvider(['{"value": "not a number"}', '{"value": 1}']);
    const result = await completeJSON(provider, baseOptions, schema);
    expect(result).toEqual({ value: 1 });
  });
});
