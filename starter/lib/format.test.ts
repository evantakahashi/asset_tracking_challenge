import { describe, expect, it } from "vitest";
import { relativeTime, formatLocationShort } from "./format";

describe("relativeTime", () => {
  const NOW = new Date("2026-05-16T12:00:00Z");

  it("formats seconds ago", () => {
    expect(relativeTime(new Date(NOW.getTime() - 30_000), NOW)).toBe("just now");
  });
  it("formats minutes", () => {
    expect(relativeTime(new Date(NOW.getTime() - 5 * 60_000), NOW)).toBe("5 min ago");
  });
  it("formats hours", () => {
    expect(relativeTime(new Date(NOW.getTime() - 3 * 3600_000), NOW)).toBe("3h ago");
  });
  it("formats days", () => {
    expect(relativeTime(new Date(NOW.getTime() - 2 * 86400_000), NOW)).toBe("2d ago");
  });
  it("formats weeks", () => {
    expect(relativeTime(new Date(NOW.getTime() - 14 * 86400_000), NOW)).toBe("2w ago");
  });
  it("formats months for older dates", () => {
    expect(relativeTime(new Date(NOW.getTime() - 90 * 86400_000), NOW)).toBe("3mo ago");
  });
});

describe("formatLocationShort", () => {
  it("returns rack/ru for in-service locations", () => {
    expect(
      formatLocationShort({ site: "A", room: "B", row: "C", rack: "R-01", ru: "U05" }),
    ).toBe("R-01/U05");
  });
  it("returns room/rack for storage", () => {
    expect(
      formatLocationShort({ site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }),
    ).toBe("Storage-1/SHELF-3");
  });
  it("returns site for nothing else", () => {
    expect(formatLocationShort({ site: "A", room: null, row: null, rack: null, ru: null })).toBe("A");
  });
});
