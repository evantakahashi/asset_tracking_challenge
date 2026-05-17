"use client";
import { useCallback, useEffect, useState } from "react";

export type ScanLogKind = "success" | "error";
export type ScanLogEntry = {
  kind: ScanLogKind;
  asset_tag: string;
  summary: string;
  timestamp: string;
};

export type ScanType = "receive" | "store" | "deploy" | "transfer";

const MAX_ENTRIES = 10;

function keyFor(scanType: ScanType, userId: string): string {
  return `asset-tracking.scan-log.${scanType}.${userId}`;
}

function read(scanType: ScanType, userId: string): ScanLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(scanType, userId));
    return raw ? (JSON.parse(raw) as ScanLogEntry[]) : [];
  } catch {
    return [];
  }
}

function write(scanType: ScanType, userId: string, entries: ScanLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(scanType, userId), JSON.stringify(entries));
  } catch {
    // quota or private mode — silently ignore
  }
}

export function useScanLog(scanType: ScanType, userId: string): {
  entries: ScanLogEntry[];
  add: (entry: Omit<ScanLogEntry, "timestamp">) => void;
  clear: () => void;
} {
  const [entries, setEntries] = useState<ScanLogEntry[]>([]);

  useEffect(() => {
    setEntries(read(scanType, userId));
  }, [scanType, userId]);

  const add = useCallback(
    (entry: Omit<ScanLogEntry, "timestamp">) => {
      setEntries((cur) => {
        const next = [{ ...entry, timestamp: new Date().toISOString() }, ...cur].slice(0, MAX_ENTRIES);
        write(scanType, userId, next);
        return next;
      });
    },
    [scanType, userId],
  );

  const clear = useCallback(() => {
    setEntries([]);
    write(scanType, userId, []);
  }, [scanType, userId]);

  return { entries, add, clear };
}
