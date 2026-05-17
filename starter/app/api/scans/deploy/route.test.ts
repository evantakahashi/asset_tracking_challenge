import { describe, expect, it, beforeEach, vi } from "vitest";
import { POST } from "./route";

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
function req(body: unknown): Request {
  return new Request("http://localhost/api/scans/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const DEPLOY_LOC = { site: "Lab-A", room: "Bay-1", row: "Aisle-1", rack: "R-01", ru: "U05" };

describe("POST /api/scans/deploy", () => {
  it("calls facilities + finance writebacks after a successful deploy", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "in_service", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: DEPLOY_LOC, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: new Date().toISOString() }),
    );
    fetchSpy.mockResolvedValueOnce(jsonRes({ ok: true })); // facilities
    fetchSpy.mockResolvedValueOnce(jsonRes({ ok: true })); // finance

    const res = await POST(req({ asset_tag: "C0001", location: DEPLOY_LOC, user_id: "tech-jane", scan_payload: "DEPLOY|C0001" }));
    expect(res.status).toBe(200);
    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBe(3);
    expect(calls[1]![0]).toContain("/mock/facilities/spaces");
    expect(JSON.parse(calls[1]![1].body)).toEqual({ tagged_id: "C0001", rack_location: "Lab-A/Bay-1/Aisle-1/R-01/U05" });
    expect(calls[2]![0]).toContain("/mock/finance/equipment");
    const finBody = JSON.parse(calls[2]![1].body);
    expect(finBody).toMatchObject({ tag: "C0001", status: "capitalized", site: "Lab-A" });
    expect(finBody.capitalized_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns 422 with incomplete_deploy_location if rack/ru missing (defensive)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "incomplete_deploy_location", message: "Deploy requires site, room, rack, and ru" } }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );
    const res = await POST(req({ asset_tag: "C0001", location: { site: "A", room: "B", row: null, rack: null, ru: null }, user_id: "tech-jane", scan_payload: "DEPLOY|C0001" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("incomplete_deploy_location");
  });
});
