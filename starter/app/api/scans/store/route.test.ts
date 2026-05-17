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
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/scans/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scans/store", () => {
  it("clears the facilities row when prior state was in_service", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "in_service", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: { site: "A", room: "B", row: "C", rack: "R", ru: "U" }, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: "" }),
    );
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "stored", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: { site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: "" }),
    );
    fetchSpy.mockResolvedValueOnce(jsonRes({ ok: true }));

    const res = await POST(req({ asset_tag: "C0001", location: { site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }, user_id: "tech-jane", scan_payload: "STORE|C0001" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.asset_tag).toBe("C0001");
    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBe(3);
    const facCall = calls[2]!;
    expect(facCall[0]).toContain("/mock/facilities/spaces");
    expect(JSON.parse(facCall[1].body)).toEqual({ tagged_id: "C0001", rack_location: null });
  });

  it("does NOT call facilities when prior state was received", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "received", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: { site: "A", room: "Receiving", row: null, rack: "DOCK-1", ru: null }, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: "" }),
    );
    fetchSpy.mockResolvedValueOnce(
      jsonRes({ asset_tag: "C0001", state: "stored", serial: "S", model: "M", manufacturer: "X", asset_class: "instrument", location: { site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }, custodian: "tech-jane", parent_asset_tag: null, procurement_note: null, created_at: "", updated_at: "" }),
    );

    await POST(req({ asset_tag: "C0001", location: { site: "A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null }, user_id: "tech-jane", scan_payload: "STORE|C0001" }));
    expect(fetchSpy.mock.calls.length).toBe(2);
  });
});
