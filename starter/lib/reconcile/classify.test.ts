import { describe, expect, it } from "vitest";
import { classifyDrift, STALE_DAYS, DISPOSAL_LAG_DAYS } from "./classify";
import type { Asset, FacilitiesRecord, FinanceRecord } from "../types";

const NOW = new Date("2026-05-16T12:00:00Z");

function ops(overrides: Partial<Asset> = {}): Asset {
  return {
    asset_tag: "C0000001",
    serial: "SN-1",
    model: "M",
    manufacturer: "Mfr",
    asset_class: "instrument",
    state: "in_service",
    location: { site: "Lab-A", room: "Bay-1", row: "Aisle-1", rack: "R-01", ru: "U05" },
    custodian: "tech-jane",
    parent_asset_tag: null,
    procurement_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function fac(overrides: Partial<FacilitiesRecord> = {}): FacilitiesRecord {
  return {
    space_id: "fac-1",
    tagged_id: "C0000001",
    rack_location: "Lab-A/Bay-1/Aisle-1/R-01/U05",
    last_observed: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function fin(overrides: Partial<FinanceRecord> = {}): FinanceRecord {
  return {
    finance_id: "EQ-1",
    tag: "C0000001",
    site: "Lab-A",
    book_value_usd: 100000,
    status: "capitalized",
    capitalized_on: "2025-09-01",
    ...overrides,
  };
}

describe("classifyDrift", () => {
  it("returns null when all three sources agree (in_service)", () => {
    expect(classifyDrift(ops(), fac(), fin(), NOW)).toBeNull();
  });

  it("flags mislocated when ops + facilities racks/rus disagree", () => {
    const result = classifyDrift(
      ops(),
      fac({ rack_location: "Lab-A/Bay-1/Aisle-1/R-01/U07" }),
      fin(),
      NOW,
    );
    expect(result).toMatchObject({
      category: "mislocated",
      tier: "today",
      asset_tag: "C0000001",
      views: {
        ops: { display: "R-01/U05" },
        facilities: { display: "Lab-A/Bay-1/Aisle-1/R-01/U07" },
      },
      action: expect.stringContaining("rack"),
    });
  });

  it("flags ghost_on_rack when ops is disposed and facilities still has a row", () => {
    const result = classifyDrift(
      ops({ state: "disposed", updated_at: "2026-05-01T00:00:00Z" }),
      fac(),
      fin(),
      NOW,
    );
    expect(result).toMatchObject({ category: "ghost_on_rack", tier: "today" });
  });

  it("flags ghost_on_rack when ops is rma_pending and facilities still has a row", () => {
    const result = classifyDrift(
      ops({ state: "rma_pending" }),
      fac(),
      fin(),
      NOW,
    );
    expect(result).toMatchObject({ category: "ghost_on_rack", tier: "today" });
  });

  it("flags orphan_on_rack when facilities has a row and ops has no record", () => {
    const result = classifyDrift(null, fac({ tagged_id: "C0000199" }), null, NOW);
    expect(result).toMatchObject({
      category: "orphan_on_rack",
      tier: "today",
      asset_tag: "C0000199",
    });
  });

  it("flags off_books when ops has the asset and finance has no record", () => {
    const result = classifyDrift(ops(), null, null, NOW);
    expect(result).toMatchObject({ category: "off_books", tier: "this_week" });
  });

  it("flags off_books even when facilities has a row (joint check is ops+!finance)", () => {
    const result = classifyDrift(ops(), fac(), null, NOW);
    expect(result).toMatchObject({
      category: "off_books",
      tier: "this_week",
      asset_tag: "C0000001",
      views: {
        ops: { display: "R-01/U05" },
        facilities: { display: expect.any(String) },
        finance: null,
      },
    });
  });

  it("flags ghost_on_books when finance has a tag and ops has no record", () => {
    const result = classifyDrift(null, null, fin({ tag: "C0000113" }), NOW);
    expect(result).toMatchObject({
      category: "ghost_on_books",
      tier: "this_week",
      asset_tag: "C0000113",
    });
  });

  it("flags disposed_but_capitalized when finance is capitalized > DISPOSAL_LAG_DAYS after disposal", () => {
    const disposalAt = new Date(NOW.getTime() - (DISPOSAL_LAG_DAYS + 5) * 86400_000).toISOString();
    const result = classifyDrift(
      ops({ state: "disposed", updated_at: disposalAt }),
      null,
      fin({ status: "capitalized" }),
      NOW,
    );
    expect(result).toMatchObject({ category: "disposed_but_capitalized", tier: "this_week" });
  });

  it("does NOT flag disposed_but_capitalized within DISPOSAL_LAG_DAYS", () => {
    const disposalAt = new Date(NOW.getTime() - 5 * 86400_000).toISOString();
    const result = classifyDrift(
      ops({ state: "disposed", updated_at: disposalAt }),
      null,
      fin({ status: "capitalized" }),
      NOW,
    );
    expect(result).toEqual({ kind: "expected" });
  });

  it("flags stale_rack_obs when in_service and facilities last_observed > STALE_DAYS", () => {
    const stale = new Date(NOW.getTime() - (STALE_DAYS + 5) * 86400_000).toISOString();
    const result = classifyDrift(ops(), fac({ last_observed: stale }), fin(), NOW);
    expect(result).toMatchObject({ category: "stale_rack_obs", tier: "watch" });
  });

  it("does NOT flag stale_rack_obs when within STALE_DAYS", () => {
    const fresh = new Date(NOW.getTime() - 10 * 86400_000).toISOString();
    expect(classifyDrift(ops(), fac({ last_observed: fresh }), fin(), NOW)).toBeNull();
  });

  it("marks expected: stored asset without a facilities row is not drift", () => {
    expect(classifyDrift(ops({ state: "stored" }), null, fin(), NOW)).toEqual({ kind: "expected" });
  });

  it("marks expected: rma_pending asset without a facilities row is not drift", () => {
    expect(classifyDrift(ops({ state: "rma_pending" }), null, fin(), NOW)).toEqual({ kind: "expected" });
  });

  it("marks expected: received asset without a facilities row is not drift", () => {
    expect(classifyDrift(ops({ state: "received" }), null, fin(), NOW)).toEqual({ kind: "expected" });
  });

  it("marks expected: disposed within DISPOSAL_LAG_DAYS without a facilities row is not drift", () => {
    const fresh = new Date(NOW.getTime() - 5 * 86400_000).toISOString();
    expect(
      classifyDrift(ops({ state: "disposed", updated_at: fresh }), null, fin({ status: "capitalized" }), NOW),
    ).toEqual({ kind: "expected" });
  });

  it("highest-priority rule: ghost_on_rack wins over disposed_but_capitalized on the same asset", () => {
    const disposalAt = new Date(NOW.getTime() - (DISPOSAL_LAG_DAYS + 5) * 86400_000).toISOString();
    const result = classifyDrift(
      ops({ state: "disposed", updated_at: disposalAt }),
      fac(),
      fin({ status: "capitalized" }),
      NOW,
    );
    expect(result).toMatchObject({ category: "ghost_on_rack", tier: "today" });
  });
});
