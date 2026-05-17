import { describe, expect, it, beforeEach, vi } from "vitest";
import { GET } from "./route";

const fetchSpy = vi.fn();
beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
  process.env.API_TOKEN = "test-token";
  process.env.API_BASE_URL = "http://upstream:8080/v1";
});

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("GET /api/reconcile", () => {
  it("returns a ReconcileReport with tiers and an expected count", async () => {
    fetchSpy.mockResolvedValueOnce(jsonRes([]));
    fetchSpy.mockResolvedValueOnce(jsonRes([]));
    fetchSpy.mockResolvedValueOnce(jsonRes([]));

    const res = await GET();
    expect(res.status).toBe(200);
    const report = await res.json();
    expect(report).toHaveProperty("generated_at");
    expect(report).toHaveProperty("tiers");
    expect(report.tiers).toHaveProperty("today");
    expect(report.tiers).toHaveProperty("this_week");
    expect(report.tiers).toHaveProperty("watch");
    expect(report).toHaveProperty("expected");
  });

  it("classifies a planted mislocation as today/mislocated", async () => {
    fetchSpy.mockResolvedValueOnce(jsonRes([
      {
        asset_tag: "C0000110",
        serial: "S",
        model: "M",
        manufacturer: "X",
        asset_class: "instrument",
        state: "in_service",
        location: { site: "Lab-A", room: "Bay-1", row: "Aisle-1", rack: "R-01", ru: "U18" },
        custodian: "tech-jane",
        parent_asset_tag: null,
        procurement_note: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]));
    fetchSpy.mockResolvedValueOnce(jsonRes([
      { space_id: "f1", tagged_id: "C0000110", rack_location: "Lab-A/Bay-1/Aisle-1/R-01/U16", last_observed: new Date().toISOString() },
    ]));
    fetchSpy.mockResolvedValueOnce(jsonRes([]));

    const res = await GET();
    const report = await res.json();
    expect(report.tiers.today.find((c: any) => c.asset_tag === "C0000110" && c.category === "mislocated")).toBeTruthy();
  });
});
