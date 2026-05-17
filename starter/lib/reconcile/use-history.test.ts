import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReconcileHistory } from "./use-history";

const STORAGE_KEY = "asset-tracking.reconcile.history";

function withStored(history: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function todaySnapshot(over: Partial<{ date: string; today: number; this_week: number; watch: number; total: number }> = {}) {
  return { date: "2026-05-17", today: 4, this_week: 2, watch: 1, total: 7, ...over };
}

describe("useReconcileHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("empty history → persists today's snapshot, mode is breakdown", () => {
    renderHook(() => useReconcileHistory(todaySnapshot()));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].date).toBe("2026-05-17");
  });

  it("same-day revisit overwrites today's entry", () => {
    withStored([{ ...todaySnapshot(), today: 1 }]);
    renderHook(() => useReconcileHistory(todaySnapshot({ today: 4 })));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].today).toBe(4);
  });

  it("history with 2 distinct days → mode is breakdown", () => {
    withStored([{ ...todaySnapshot({ date: "2026-05-15", total: 3 }) }, { ...todaySnapshot({ date: "2026-05-16", total: 5 }) }]);
    const { result } = renderHook(() => useReconcileHistory(todaySnapshot()));
    expect(result.current.mode).toBe("breakdown");
  });

  it("history with 3 distinct days → mode is sparkline", () => {
    withStored([
      { ...todaySnapshot({ date: "2026-05-14", total: 3 }) },
      { ...todaySnapshot({ date: "2026-05-15", total: 4 }) },
      { ...todaySnapshot({ date: "2026-05-16", total: 5 }) },
    ]);
    const { result } = renderHook(() => useReconcileHistory(todaySnapshot()));
    expect(result.current.mode).toBe("sparkline");
  });

  it("trims to 28 entries oldest-first", () => {
    const long = Array.from({ length: 30 }, (_, i) => todaySnapshot({ date: `2026-04-${String(i + 1).padStart(2, "0")}`, total: i }));
    withStored(long);
    renderHook(() => useReconcileHistory(todaySnapshot()));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(28);
    expect(stored[0].date).not.toBe("2026-04-01");
    expect(stored[0].date).not.toBe("2026-04-02");
  });

  it("corrupted JSON resets to [today]", () => {
    localStorage.setItem(STORAGE_KEY, "not json");
    renderHook(() => useReconcileHistory(todaySnapshot()));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].date).toBe("2026-05-17");
  });
});
