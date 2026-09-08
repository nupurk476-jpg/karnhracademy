import { describe, it, expect } from "vitest";
import { csvField, toCsv } from "./csv";

describe("csvField", () => {
  it("quotes ordinary values", () => {
    expect(csvField("student@example.com")).toBe('"student@example.com"');
  });

  it("escapes embedded quotes by doubling them", () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });

  it("keeps commas and newlines inside one field", () => {
    expect(csvField("Karn, HR")).toBe('"Karn, HR"');
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });

  // CSV injection: a subscriber list is user-supplied text, and a
  // spreadsheet will execute these on open unless they are defused.
  it("defuses values a spreadsheet would treat as a formula", () => {
    expect(csvField("=1+1")).toBe(`"'=1+1"`);
    expect(csvField("+44 123")).toBe(`"'+44 123"`);
    expect(csvField("-5")).toBe(`"'-5"`);
    expect(csvField("@handle")).toBe(`"'@handle"`);
    expect(csvField(`=cmd|'/c calc'!A1`)).toBe(`"'=cmd|'/c calc'!A1"`);
  });

  it("leaves an email that merely contains @ alone", () => {
    expect(csvField("a@b.com")).toBe('"a@b.com"');
  });

  it("renders null and undefined as empty", () => {
    expect(csvField(null)).toBe('""');
    expect(csvField(undefined)).toBe('""');
  });
});

describe("toCsv", () => {
  it("joins a header and rows with CRLF", () => {
    const csv = toCsv(["email", "joined"], [["a@b.com", "2026-01-01"]]);
    expect(csv).toBe('"email","joined"\r\n"a@b.com","2026-01-01"');
  });

  it("produces a header-only document for an empty list", () => {
    expect(toCsv(["email"], [])).toBe('"email"');
  });
});
