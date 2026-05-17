"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "asset-tracking.reconcile.history";
const MAX_ENTRIES = 28;
const SPARKLINE_THRESHOLD = 4; // distinct days (3 prior + today)

export type DailySnapshot = {
  date: string; // YYYY-MM-DD, local
  today: number;
  this_week: number;
  watch: number;
  total: number;
};

export type HistoryMode = "sparkline" | "breakdown";

export type UseReconcileHistoryResult = {
  history: DailySnapshot[];
  mode: HistoryMode;
  weekDelta: number | null; // current 7-day total minus prior 7-day total; null if not enough data
};

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function read(): DailySnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is DailySnapshot =>
        typeof e === "object" && e !== null &&
        typeof (e as DailySnapshot).date === "string" &&
        typeof (e as DailySnapshot).total === "number",
    );
  } catch {
    return [];
  }
}

function write(history: DailySnapshot[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // quota — ignore
  }
}

function mergeToday(history: DailySnapshot[], today: DailySnapshot): DailySnapshot[] {
  const idx = history.findIndex((h) => h.date === today.date);
  const next = idx >= 0 ? [...history.slice(0, idx), today, ...history.slice(idx + 1)] : [...history, today];
  return next.slice(-MAX_ENTRIES);
}

export function useReconcileHistory(todaySnap: DailySnapshot): UseReconcileHistoryResult {
  const [history, setHistory] = useState<DailySnapshot[]>([]);

  useEffect(() => {
    const existing = read();
    const merged = mergeToday(existing, todaySnap);
    write(merged);
    setHistory(merged);
  }, [todaySnap.date, todaySnap.total, todaySnap.today, todaySnap.this_week, todaySnap.watch]);

  const distinctDays = new Set(history.map((h) => h.date)).size;
  const mode: HistoryMode = distinctDays >= SPARKLINE_THRESHOLD ? "sparkline" : "breakdown";

  let weekDelta: number | null = null;
  if (history.length >= 14) {
    const sortedAsc = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const recent7 = sortedAsc.slice(-7).reduce((s, h) => s + h.total, 0);
    const prior7 = sortedAsc.slice(-14, -7).reduce((s, h) => s + h.total, 0);
    weekDelta = recent7 - prior7;
  }

  return { history, mode, weekDelta };
}

export function makeTodaySnapshot(now: Date, counts: { today: number; this_week: number; watch: number }): DailySnapshot {
  return {
    date: localDateKey(now),
    today: counts.today,
    this_week: counts.this_week,
    watch: counts.watch,
    total: counts.today + counts.this_week + counts.watch,
  };
}
