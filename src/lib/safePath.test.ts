import { describe, it, expect } from "vitest";
import { safeInternalPath } from "./safePath";

describe("safeInternalPath", () => {
  it("allows an ordinary internal path", () => {
    expect(safeInternalPath("/quizzes/abc")).toBe("/quizzes/abc");
    expect(safeInternalPath("/pyqs/view/1?page=2")).toBe("/pyqs/view/1?page=2");
  });

  // The reason this function exists: `next` travels in the URL across the
  // OAuth round trip, so it is attacker-controllable.
  it("rejects absolute URLs", () => {
    expect(safeInternalPath("https://evil.example/phish")).toBe("/");
    expect(safeInternalPath("http://evil.example")).toBe("/");
  });

  it("rejects protocol-relative and backslash tricks", () => {
    expect(safeInternalPath("//evil.example")).toBe("/");
    expect(safeInternalPath("/\\evil.example")).toBe("/");
  });

  it("rejects anything not anchored at the root", () => {
    expect(safeInternalPath("evil.example")).toBe("/");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/");
  });

  it("falls back for empty input", () => {
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath(undefined)).toBe("/");
    expect(safeInternalPath("")).toBe("/");
  });

  it("honours a custom fallback", () => {
    expect(safeInternalPath("https://evil.example", "/profile")).toBe("/profile");
  });
});
