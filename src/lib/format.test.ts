import { describe, it, expect } from "vitest";
import { tidyTitle, timeAgo } from "./format";

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
