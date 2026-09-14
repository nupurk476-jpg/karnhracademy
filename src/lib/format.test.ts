import { describe, it, expect } from "vitest";
import { tidyTitle, timeAgo, timeAgoPrecise, formatDateTime } from "./format";

describe("tidyTitle", () => {
  it("title-cases an ALL CAPS admin title and keeps acronyms", () => {
    expect(tidyTitle("PERFORMANCE MANAGEMENT PPT UNIT 2")).toBe("Performance Management PPT Unit 2");
    expect(tidyTitle("UGC NET HRM NOTES CODE 55 UNIT II")).toBe("UGC NET HRM Notes Code 55 Unit II");
  });
  it("leaves mixed-case titles untouched", () => {
    expect(tidyTitle("New Trends in HRM – UGC NET Notes | Code 55 Unit II Part 6")).toBe("New Trends in HRM – UGC NET Notes | Code 55 Unit II Part 6");
  });
  it("still humanises filename-style titles", () => {
    expect(tidyTitle("UGC-NET-HR-June-2025-Question-Paper.pdf")).toBe("UGC NET HR June 2025 Question Paper");
  });
});

describe("timeAgo", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  it("reports fresh items in days and weeks", () => {
    expect(timeAgo(daysAgo(0))).toBe("today");
    expect(timeAgo(daysAgo(1))).toBe("yesterday");
    expect(timeAgo(daysAgo(3))).toBe("3 days ago");
    expect(timeAgo(daysAgo(14))).toBe("2 weeks ago");
  });
});

describe("timeAgoPrecise", () => {
  const agoSeconds = (n: number) => new Date(Date.now() - n * 1000).toISOString();
  it("resolves inside the hour, where timeAgo only says 'today'", () => {
    expect(timeAgoPrecise(agoSeconds(5))).toBe("just now");
    expect(timeAgoPrecise(agoSeconds(90))).toBe("1 min ago");
    expect(timeAgoPrecise(agoSeconds(45 * 60))).toBe("45 min ago");
  });
  it("reports hours up to a day, then hands off to timeAgo", () => {
    expect(timeAgoPrecise(agoSeconds(3 * 3600))).toBe("3 hr ago");
    expect(timeAgoPrecise(agoSeconds(23 * 3600))).toBe("23 hr ago");
    expect(timeAgoPrecise(agoSeconds(25 * 3600))).toBe("yesterday");
    expect(timeAgoPrecise(agoSeconds(3 * 86_400))).toBe("3 days ago");
  });
  it("does not report a future timestamp as a negative age", () => {
    // Server clocks run slightly ahead of the browser often enough that
    // "-1 min ago" would show up in the admin for real.
    expect(timeAgoPrecise(agoSeconds(-30))).toBe("just now");
  });
});

describe("formatDateTime", () => {
  it("includes the clock time, unlike formatDate", () => {
    const out = formatDateTime("2026-09-14T17:32:00.000Z");
    expect(out).toMatch(/2026/);
    // Time-of-day present in some form (locale/timezone decide the exact text).
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});
