"use client";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

const STATES = ["all", "in_service", "stored", "received", "rma_pending", "disposed"] as const;
const SITES = ["all", "Lab-Building-A", "Lab-Building-B", "Lab-Building-C"];

export function ManagerFilters(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const state = params.get("state") ?? "all";
  const site = params.get("site") ?? "all";
  const q = params.get("q") ?? "";

  function update(next: Partial<{ state: string; site: string; q: string }>): void {
    const np = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all" || v === "") np.delete(k);
      else np.set(k, v);
    }
    router.replace(`/manager?${np.toString()}`);
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        defaultValue={q}
        placeholder="Search tag, serial, custodian, model…"
        onChange={(e) => update({ q: e.target.value })}
        className="w-full p-2 rounded-md border border-neutral-300 bg-neutral-50 text-sm"
      />
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500 mr-1">State</span>
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => update({ state: s })}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-full border",
              state === s ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50",
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">Site</span>
        <select
          value={site}
          onChange={(e) => update({ site: e.target.value })}
          className="text-xs rounded border border-neutral-300 bg-white px-2 py-1"
        >
          {SITES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All sites" : s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
