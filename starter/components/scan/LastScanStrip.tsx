"use client";
import { Tag } from "../Tag";
import { useScanLog, type ScanType } from "@/lib/scan-log/use-scan-log";
import { useScanUndo } from "@/lib/scan-undo/use-scan-undo";

function relativeShort(secs: number): string {
  if (secs < 60) return `${secs}s ago`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function LastScanStrip({ scanType, userId }: { scanType: ScanType; userId: string }): React.ReactElement | null {
  const { entries } = useScanLog(scanType, userId);
  const lastEntry = entries[0] ?? null;
  const { status, secondsAgo, undo } = useScanUndo(lastEntry, scanType, userId);

  if (!lastEntry) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border border-neutral-200 bg-white rounded-md text-xs">
      <div className="flex items-center gap-2 min-w-0 truncate">
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Last scan</span>
        <Tag value={lastEntry.asset_tag} className="text-xs" />
        <span className={lastEntry.kind === "error" ? "text-red-700 truncate" : "text-neutral-600 truncate"}>{lastEntry.summary}</span>
        <span className="font-mono text-[10px] text-neutral-400">{relativeShort(secondsAgo)}</span>
      </div>
      {status === "available" ? (
        <button
          type="button"
          onClick={() => void undo()}
          className="text-xs text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 px-2.5 py-1 rounded-md"
        >
          ↶ Undo
        </button>
      ) : status === "expired" ? (
        <span className="text-[10px] text-neutral-400">Undo window closed</span>
      ) : null}
    </div>
  );
}
