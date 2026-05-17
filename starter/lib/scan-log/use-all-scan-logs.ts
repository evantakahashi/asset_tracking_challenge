"use client";
import { useEffect, useState } from "react";
import type { ScanLogEntry, ScanType } from "./use-scan-log";

const SCAN_TYPES: ScanType[] = ["receive", "store", "deploy", "transfer"];

export type ScanLogEntryWithType = ScanLogEntry & { scanType: ScanType };

function keyFor(scanType: ScanType, userId: string): string {
  return `asset-tracking.scan-log.${scanType}.${userId}`;
}

function readOne(scanType: ScanType, userId: string): ScanLogEntryWithType[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(scanType, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanLogEntry[];
    return parsed.map((e) => ({ ...e, scanType }));
  } catch {
    return [];
  }
}

export function useAllScanLogs(userId: string): ScanLogEntryWithType[] {
  const [entries, setEntries] = useState<ScanLogEntryWithType[]>([]);

  useEffect(() => {
    const all: ScanLogEntryWithType[] = [];
    for (const st of SCAN_TYPES) all.push(...readOne(st, userId));
    all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setEntries(all);
  }, [userId]);

  return entries;
}
