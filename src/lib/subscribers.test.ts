import { describe, it, expect } from "vitest";
import { activeSubscribers, type Subscriber } from "./subscribers";

const sub = (email: string, unsubscribed_at: string | null = null): Subscriber => ({
  id: email, email, created_at: "2026-01-01T00:00:00Z", unsubscribed_at,
});

describe("activeSubscribers", () => {
  it("keeps everyone who has not opted out", () => {
    const rows = [sub("a@x.com"), sub("b@x.com")];
    expect(activeSubscribers(rows).map(s => s.email)).toEqual(["a@x.com", "b@x.com"]);
  });

  // The rule the whole unsubscribe feature rests on.
  it("drops anyone who unsubscribed", () => {
    const rows = [sub("a@x.com"), sub("gone@x.com", "2026-02-01T00:00:00Z")];
    expect(activeSubscribers(rows).map(s => s.email)).toEqual(["a@x.com"]);
  });

  it("narrows by search term", () => {
    const rows = [sub("nupur@x.com"), sub("student@y.com")];
    expect(activeSubscribers(rows, "y.com").map(s => s.email)).toEqual(["student@y.com"]);
  });

  // A search must never reach past the opt-out filter, even when the term
  // matches an unsubscribed address exactly.
  it("still excludes an unsubscribed address that matches the search", () => {
    const rows = [sub("gone@x.com", "2026-02-01T00:00:00Z"), sub("here@x.com")];
    expect(activeSubscribers(rows, "gone@x.com")).toEqual([]);
  });

  it("is case-insensitive on the term", () => {
    expect(activeSubscribers([sub("Student@X.com")], "student").length).toBe(1);
  });

  it("returns nothing for an empty list", () => {
    expect(activeSubscribers([])).toEqual([]);
  });
});
