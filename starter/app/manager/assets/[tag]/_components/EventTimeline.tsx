import clsx from "clsx";
import type { Event } from "@/lib/types";
import { serializeLocation } from "@/lib/location";

const EVENT_COLORS: Record<Event["event_type"], string> = {
  receive: "bg-yellow-50 text-yellow-800 border-yellow-200",
  store: "bg-neutral-100 text-neutral-700 border-neutral-200",
  deploy: "bg-green-50 text-green-800 border-green-200",
  transfer_custody: "bg-amber-50 text-amber-800 border-amber-200",
  rma_open: "bg-orange-50 text-orange-800 border-orange-200",
  rma_receive_back: "bg-yellow-50 text-yellow-800 border-yellow-200",
  dispose: "bg-red-50 text-red-800 border-red-200",
  duplicate_receive: "bg-neutral-50 text-neutral-500 border-neutral-200",
};

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function EventTimeline({ events }: { events: Event[] }): React.ReactElement {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No events recorded for this asset yet.</p>;
  }
  const days: { key: string; events: Event[] }[] = [];
  let cur: { key: string; events: Event[] } | null = null;
  for (const e of events) {
    const k = dayKey(e.timestamp);
    if (!cur || cur.key !== k) {
      cur = { key: k, events: [] };
      days.push(cur);
    }
    cur.events.push(e);
  }

  return (
    <div className="space-y-5">
      {days.map((d) => (
        <div key={d.key}>
          <div className="sticky top-0 bg-white py-1 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
            {dayLabel(d.key)}
          </div>
          <ul className="space-y-3 mt-2">
            {d.events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className={clsx("inline-block text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider font-medium whitespace-nowrap h-fit mt-0.5", EVENT_COLORS[e.event_type])}>
                  {e.event_type.replace("_", " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-neutral-700">
                    {e.from_state ? <><span className="font-mono">{e.from_state}</span> → </> : null}
                    <span className="font-mono">{e.to_state}</span>
                    {" · "}
                    <span className="font-mono text-xs">{e.user_id}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">
                    {serializeLocation(e.to_location)}
                  </div>
                  <details className="mt-1">
                    <summary className="text-[10px] text-neutral-400 cursor-pointer">scan payload</summary>
                    <code className="block mt-1 text-[11px] bg-neutral-50 border border-neutral-100 rounded px-2 py-1 font-mono whitespace-pre-wrap">{e.scan_payload}</code>
                  </details>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono shrink-0 mt-1">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
