import { describe, it, expect } from "vitest";
import { firstName } from "./firstName";

describe("firstName", () => {
  it("takes the first word of a full name", () => {
    expect(firstName("Gagan Kumar Sharma")).toBe("Gagan");
    expect(firstName("Nupur Karn")).toBe("Nupur");
  });

  it("passes a single name through", () => {
    expect(firstName("Gagan")).toBe("Gagan");
  });

  it("handles surrounding and internal whitespace", () => {
    expect(firstName("   Gagan   Kumar  ")).toBe("Gagan");
  });

  // The case that makes this function worth having: Google may give us
  // nothing, and the fallback elsewhere is an email prefix.
  it("falls back to 'there' rather than greeting an identifier", () => {
    expect(firstName("gk.sharma91")).toBe("there");
    expect(firstName("user_2837")).toBe("there");
    expect(firstName("a1b2")).toBe("there");
  });

  it("falls back for empty, missing, or single-letter input", () => {
    expect(firstName(null)).toBe("there");
    expect(firstName(undefined)).toBe("there");
    expect(firstName("")).toBe("there");
    expect(firstName("   ")).toBe("there");
    expect(firstName("G")).toBe("there");
  });

  it("accepts non-Latin scripts", () => {
    expect(firstName("नुपुर कर्ण")).toBe("नुपुर");
  });

  it("accepts names with an apostrophe or hyphen", () => {
    expect(firstName("O'Brien")).toBe("O'Brien");
    expect(firstName("Anne-Marie Dubois")).toBe("Anne-Marie");
  });
});
