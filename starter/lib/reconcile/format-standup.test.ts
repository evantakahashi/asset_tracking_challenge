import { describe, expect, it } from "vitest";
import { formatStandupPunchList } from "./format-standup";
import type { DriftCard, ReconcileReport } from "./types";

const NOW = new Date("2026-05-17T08:54:00Z");

function emptyReport(): ReconcileReport {
  return {
    generated_at: NOW.toISOString(),
    counts: { today: 0, this_week: 0, watch: 0, expected: 100 },
    tiers: { today: [], this_week: [], watch: [] },
    expected: { stored_or_received_not_racked: 100, disposed_not_racked: 0 },
  };
}

function card(over: Partial<DriftCard>): DriftCard {
  return {
    category: "mislocated",
    tier: "today",
    asset_tag: "C0000001",
    views: { ops: { display: "R-01/U05" }, facilities: { display: "Lab-A/Bay-1/Aisle-1/R-01/U07" }, finance: null },
    action: "Walk the rack and re-scan; whichever system disagrees with the physical reality gets corrected.",
    ...over,
  };
}

describe("formatStandupPunchList", () => {
  it("returns an empty-but-honest one-liner when nothing's drifting", () => {
    const out = formatStandupPunchList(emptyReport(), NOW);
    expect(out).toMatch(/all tracked assets agree today/i);
    expect(out).not.toContain("Investigate today");
  });

  it("today-only — no this_week or watch headers", () => {
    const r = emptyReport();
    r.tiers.today = [card({})];
    r.counts.today = 1;
    const out = formatStandupPunchList(r, NOW);
    expect(out).toContain("*Investigate today (1):*");
    expect(out).not.toContain("Investigate this week");
    expect(out).not.toContain("Worth knowing");
  });

  it("full output — all three tier headers, ordering today → this_week → watch", () => {
    const r = emptyReport();
    r.tiers.today = [card({ category: "mislocated" })];
    r.tiers.this_week = [card({ category: "off_books", tier: "this_week", asset_tag: "C0000002", views: { ops: { display: "received" }, facilities: null, finance: null } })];
    r.tiers.watch = [card({ category: "stale_rack_obs", tier: "watch", asset_tag: "C0000003", context: "Last seen 195 days ago" })];
    r.counts = { today: 1, this_week: 1, watch: 1, expected: 0 };
    const out = formatStandupPunchList(r, NOW);
    const todayIdx = out.indexOf("*Investigate today");
    const weekIdx = out.indexOf("*Investigate this week");
    const watchIdx = out.indexOf("*Worth knowing");
    expect(todayIdx).toBeGreaterThan(-1);
    expect(weekIdx).toBeGreaterThan(todayIdx);
    expect(watchIdx).toBeGreaterThan(weekIdx);
  });

  it("wraps tags in backticks and prepends a category code", () => {
    const r = emptyReport();
    r.tiers.today = [card({})];
    r.counts.today = 1;
    const out = formatStandupPunchList(r, NOW);
    expect(out).toContain("`C0000001`");
    expect(out).toContain("[MIS]");
  });

  it("has no trailing whitespace or double-newlines", () => {
    const r = emptyReport();
    r.tiers.today = [card({}), card({ asset_tag: "C0000002" })];
    r.counts.today = 2;
    const out = formatStandupPunchList(r, NOW);
    expect(out).not.toMatch(/[ \t]+\n/);
    expect(out).not.toMatch(/\n\n\n/);
  });
});
