// starter/app/manager/_components/BrowseAllAssets.tsx
"use client";
import { useState } from "react";
import { Tag } from "@/components/Tag";
import { StatePill } from "@/components/StatePill";
import { ManagerFilters } from "./ManagerFilters";
import { relativeTime } from "@/lib/format";
import type { Asset } from "@/lib/types";

interface Props {
  assets: Asset[];
  filtered: Asset[];
  visible: Asset[];
  hasMore: boolean;
  filteredCount: number;
  pageSize: number;
  visibleCount: number;
  params: Record<string, string | undefined>;
  emptyMessage: string;
}

export function BrowseAllAssets({ assets, visible, hasMore, filteredCount, pageSize, visibleCount, params, emptyMessage }: Props): React.ReactElement {
  const [open, setOpen] = useState(params.expanded === "true");
  return (
    <section className="border-t border-neutral-200 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 font-semibold hover:text-neutral-700"
      >
        {open ? "▾" : "▸"} Browse all {assets.length.toLocaleString()} assets
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <ManagerFilters />
          <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">Tag</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">State</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">Site</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">Custodian</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium font-mono">Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-neutral-500">{emptyMessage}</td></tr>
                ) : visible.map((a) => (
                  <tr key={a.asset_tag} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-3 py-2"><Tag value={a.asset_tag} href={`/manager/assets/${a.asset_tag}`} /></td>
                    <td className="px-3 py-2"><StatePill state={a.state} /></td>
                    <td className="px-3 py-2 text-neutral-700">{a.location.site}</td>
                    <td className="px-3 py-2 text-neutral-700 font-mono text-xs">{a.custodian}</td>
                    <td className="px-3 py-2 text-neutral-500 text-xs">{relativeTime(a.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore ? (
              <div className="border-t border-neutral-200 bg-neutral-50 p-3 flex justify-center">
                <a href={`?${new URLSearchParams({ ...params, page: String(Number(params.page ?? "1") + 1) } as Record<string, string>).toString()}`} className="text-xs text-neutral-700 hover:underline">
                  Load {Math.min(pageSize, filteredCount - visibleCount)} more · {visibleCount} of {filteredCount}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
