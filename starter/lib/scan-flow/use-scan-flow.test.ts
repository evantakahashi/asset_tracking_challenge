import { describe, expect, it } from "vitest";
import { scanFlowReducer, initialScanFlow } from "./use-scan-flow";

describe("scanFlowReducer", () => {
  it("starts idle with no asset/location", () => {
    expect(initialScanFlow).toMatchObject({ status: "idle", asset: null, location: null });
  });

  it("ASSET_FETCHED moves to asset_scanned", () => {
    const next = scanFlowReducer(initialScanFlow, {
      type: "ASSET_FETCHED",
      asset: { asset_tag: "C0001" } as any,
    });
    expect(next.status).toBe("asset_scanned");
    expect(next.asset?.asset_tag).toBe("C0001");
  });

  it("LOCATION_SCANNED requires asset_scanned", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "asset_scanned", asset: { asset_tag: "C0001" } as any }, {
      type: "LOCATION_SCANNED",
      location: { site: "A", room: "B", row: null, rack: "S", ru: null },
    });
    expect(next.status).toBe("ready_to_commit");
  });

  it("BADGE_SCANNED is an alias for location-shape (transfer flow)", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "asset_scanned", asset: { asset_tag: "C0001" } as any }, {
      type: "BADGE_SCANNED",
      badge: "tech-mike",
    });
    expect(next.status).toBe("ready_to_commit");
    expect(next.badge).toBe("tech-mike");
  });

  it("COMMIT_START moves to committing", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "ready_to_commit" }, { type: "COMMIT_START" });
    expect(next.status).toBe("committing");
  });

  it("COMMIT_SUCCESS resets to idle but keeps the receipt", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "committing" }, {
      type: "COMMIT_SUCCESS",
      asset: { asset_tag: "C0001" } as any,
    });
    expect(next.status).toBe("idle");
    expect(next.lastReceipt?.asset_tag).toBe("C0001");
  });

  it("ERROR sets error message; resets status to idle for next scan", () => {
    const next = scanFlowReducer({ ...initialScanFlow, status: "committing" }, {
      type: "ERROR",
      code: "invalid_transition",
      message: "Can't store from received",
    });
    expect(next.error?.code).toBe("invalid_transition");
    expect(next.status).toBe("idle");
  });

  it("RESET clears everything", () => {
    const populated = scanFlowReducer(initialScanFlow, {
      type: "ASSET_FETCHED",
      asset: { asset_tag: "C0001" } as any,
    });
    expect(scanFlowReducer(populated, { type: "RESET" })).toEqual(initialScanFlow);
  });
});
