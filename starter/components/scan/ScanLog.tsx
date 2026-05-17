"use client";
import clsx from "clsx";
import type { ScanLogEntry } from "@/lib/scan-log/use-scan-log";
import { Tag } from "../Tag";

export function ScanLog({ entries, emptyHint }: { entries: ScanLogEntry[]; emptyHint: string }): React.ReactElement {
  if (entries.length === 0) {
    return <p className="text-xs text-neutral-500">{emptyHint}</p>;
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">
        Earlier in this session
      </div>
      <ul>
        {entries.map((e, i) => (
          <li key={`${e.timestamp}-${i}`} className="flex items-center justify-between py-1.5 text-xs border-b border-neutral-100 last:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <Tag value={e.asset_tag} className="text-xs" />
              <span className={clsx("truncate", e.kind === "error" ? "text-red-700" : "text-neutral-600")}>{e.summary}</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono shrink-0">
              {new Date(e.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
