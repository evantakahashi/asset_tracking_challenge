"use client";
import { useEffect, useState } from "react";
import type { ScanLogEntry, ScanType } from "../scan-log/use-scan-log";

const UNDO_WINDOW_MS = 30_000;

export type UndoStatus = "unavailable" | "available" | "expired";

export function useScanUndo(lastEntry: ScanLogEntry | null, scanType: ScanType, userId: string): {
  status: UndoStatus;
  secondsAgo: number;
  undo: () => Promise<void>;
} {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!lastEntry) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [lastEntry]);

  if (!lastEntry || lastEntry.kind !== "success") {
    return { status: "unavailable", secondsAgo: 0, undo: async () => {} };
  }

  const secondsAgo = Math.floor((Date.now() - new Date(lastEntry.timestamp).getTime()) / 1000);
  const reversible = scanType === "deploy" || scanType === "transfer" || scanType === "store";
  const inWindow = (Date.now() - new Date(lastEntry.timestamp).getTime()) < UNDO_WINDOW_MS;

  if (!reversible) return { status: "unavailable", secondsAgo, undo: async () => {} };
  if (!inWindow) return { status: "expired", secondsAgo, undo: async () => {} };

  async function undo(): Promise<void> {
    if (!lastEntry) return;
    // Fetch the most recent event for this asset to get the from_state / from_location.
    const eventsRes = await fetch(`/api/upstream/assets/${lastEntry.asset_tag}/events`, { cache: "no-store" });
    if (!eventsRes.ok) return;
    const events = (await eventsRes.json()) as Array<{
      event_type: string;
      from_state: string | null;
      to_state: string;
      from_location: { site: string; room: string | null; row: string | null; rack: string | null; ru: string | null } | null;
      to_location: { site: string; room: string | null; row: string | null; rack: string | null; ru: string | null };
      user_id: string;
    }>;
    const last = events[0];
    if (!last) return;

    const undoPayload = `UNDO|${last.event_type}|${lastEntry.asset_tag}`;

    if (scanType === "deploy") {
      // Reverse a deploy by storing the asset back at its prior storage location (from_location).
      const from = last.from_location;
      if (!from || from.rack == null) return;
      await fetch("/api/scans/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: lastEntry.asset_tag,
          location: from,
          user_id: userId,
          scan_payload: undoPayload,
        }),
      });
    } else if (scanType === "store") {
      // Reverse a store by re-deploying back to from_location if it had a complete rack.
      const from = last.from_location;
      if (from && from.rack && from.ru) {
        await fetch("/api/scans/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_tag: lastEntry.asset_tag,
            location: from,
            user_id: userId,
            scan_payload: undoPayload,
          }),
        });
      }
    } else if (scanType === "transfer") {
      // Reverse a transfer by transferring back to the previous custodian.
      await fetch("/api/scans/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: lastEntry.asset_tag,
          to_custodian: last.user_id,
          user_id: userId,
          scan_payload: undoPayload,
        }),
      });
    }
    // Reload to surface the new state.
    window.location.reload();
  }

  return { status: "available", secondsAgo, undo };
}
