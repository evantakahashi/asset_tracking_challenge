"use client";

import { useEffect, useState } from "react";

type DriftKey = { tag: string; category: string };

type LastVisit = {
  ts: string;
  keys: string[]; // serialized "tag::category"
};

const STORAGE_KEY = "asset-tracking.reconcile.last-visit";

function key(d: DriftKey): string {
  return `${d.tag}::${d.category}`;
}

function readLastVisit(): LastVisit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LastVisit) : null;
  } catch {
    return null;
  }
}

function writeLastVisit(now: LastVisit): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(now));
  } catch {
    // quota — ignore
  }
}

function relativeShort(iso: string, now: Date): string {
  const sec = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (sec < 90) return "moments ago";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  return `${Math.floor(day / 7)}w ago`;
}

export function LastVisitBand({ current }: { current: DriftKey[] }): React.ReactElement | null {
  const [diff, setDiff] = useState<{
    isFirstVisit: boolean;
    lastVisitAt: string | null;
    newCount: number;
    resolvedCount: number;
    carriedCount: number;
  } | null>(null);

  useEffect(() => {
    const last = readLastVisit();
    const currentKeys = current.map(key);
    const currentSet = new Set(currentKeys);

    let newCount = 0;
    let resolvedCount = 0;
    let carriedCount = 0;
    let isFirstVisit = false;
    let lastVisitAt: string | null = null;

    if (!last) {
      isFirstVisit = true;
      newCount = current.length;
    } else {
      lastVisitAt = last.ts;
      const lastSet = new Set(last.keys);
      for (const k of currentSet) {
        if (lastSet.has(k)) carriedCount++;
        else newCount++;
      }
      for (const k of lastSet) {
        if (!currentSet.has(k)) resolvedCount++;
      }
    }

    setDiff({ isFirstVisit, lastVisitAt, newCount, resolvedCount, carriedCount });
    // Persist the snapshot AFTER the diff render so the next visit sees today's report.
    writeLastVisit({ ts: new Date().toISOString(), keys: currentKeys });
  }, [current]);

  if (!diff) return null;

  // Hide the band entirely on the very first visit — there's nothing to diff against.
  if (diff.isFirstVisit) return null;

  // No changes at all: still surface it, but tersely.
  if (diff.newCount === 0 && diff.resolvedCount === 0) {
    return (
      <div className="text-xs text-neutral-500">
        Nothing changed since you last looked
        {diff.lastVisitAt ? ` (${relativeShort(diff.lastVisitAt, new Date())})` : ""}.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2">
      {diff.newCount > 0 ? (
        <span>
          <span className="font-mono font-semibold text-red-700">{diff.newCount}</span>
          <span className="ml-1">new</span>
        </span>
      ) : null}
      {diff.resolvedCount > 0 ? (
        <span>
          <span className="font-mono font-semibold text-green-700">{diff.resolvedCount}</span>
          <span className="ml-1">resolved</span>
        </span>
      ) : null}
      <span className="text-neutral-500 ml-auto">
        since you last looked
        {diff.lastVisitAt ? ` · ${relativeShort(diff.lastVisitAt, new Date())}` : ""}
      </span>
    </div>
  );
}
