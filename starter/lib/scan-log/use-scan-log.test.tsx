import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScanLog } from "./use-scan-log";

describe("useScanLog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useScanLog("store", "tech-jane"));
    expect(result.current.entries).toEqual([]);
  });

  it("appends successes to the front, caps at 10", () => {
    const { result } = renderHook(() => useScanLog("store", "tech-jane"));
    act(() => {
      for (let i = 0; i < 12; i++) {
        result.current.add({ kind: "success", asset_tag: `C000${i}`, summary: `→ SHELF-${i}` });
      }
    });
    expect(result.current.entries).toHaveLength(10);
    expect(result.current.entries[0]?.asset_tag).toBe("C00011");
  });

  it("persists across hook instances with the same key", () => {
    const { result, unmount } = renderHook(() => useScanLog("store", "tech-jane"));
    act(() => result.current.add({ kind: "success", asset_tag: "C0001", summary: "→ SHELF-1" }));
    unmount();
    const { result: r2 } = renderHook(() => useScanLog("store", "tech-jane"));
    expect(r2.current.entries[0]?.asset_tag).toBe("C0001");
  });

  it("scopes by scanType + userId", () => {
    const { result: a } = renderHook(() => useScanLog("store", "tech-jane"));
    const { result: b } = renderHook(() => useScanLog("deploy", "tech-jane"));
    act(() => a.current.add({ kind: "success", asset_tag: "C0001", summary: "→ S" }));
    expect(a.current.entries).toHaveLength(1);
    expect(b.current.entries).toHaveLength(0);
  });

  it("clear() empties the log", () => {
    const { result } = renderHook(() => useScanLog("store", "tech-jane"));
    act(() => result.current.add({ kind: "success", asset_tag: "C0001", summary: "→ S" }));
    act(() => result.current.clear());
    expect(result.current.entries).toEqual([]);
  });
});
