import { describe, it, expect } from "vitest";
import { parseCSV, sniffDelimiter } from "../csv";

describe("parseCSV", () => {
  it("parses simple rows", () => {
    expect(parseCSV("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseCSV('question,answer\n"What is 2,000 + 1?","He said ""three"""');
    expect(rows[1]).toEqual(['What is 2,000 + 1?', 'He said "three"']);
  });

  it("handles embedded newlines inside quotes", () => {
    const rows = parseCSV('q\n"line one\nline two"');
    expect(rows[1][0]).toBe("line one\nline two");
  });

  it("handles CRLF line endings", () => {
    expect(parseCSV("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("skips fully empty rows", () => {
    expect(parseCSV("a,b\n\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("sniffDelimiter", () => {
  it("detects semicolons", () => {
    expect(sniffDelimiter("a;b;c\n1;2;3")).toBe(";");
  });

  it("detects tabs", () => {
    expect(sniffDelimiter("a\tb\tc")).toBe("\t");
  });

  it("defaults to comma", () => {
    expect(sniffDelimiter("plain text line")).toBe(",");
  });
});
