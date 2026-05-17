import { api } from "@/lib/api-client";
import { Tag } from "@/components/Tag";
import { StatePill } from "@/components/StatePill";
import { MorningBands } from "./_components/MorningBands";
import { ManagerFilters } from "./_components/ManagerFilters";
import { relativeTime } from "@/lib/format";
import { staticLabelFor } from "@/lib/reconcile/labels";
import type { Asset } from "@/lib/types";
import type { DriftCard, ReconcileReport } from "@/lib/reconcile/types";

const PAGE_SIZE = 50;

async function fetchReport(): Promise<ReconcileReport | null> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/reconcile`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ReconcileReport;
  } catch {
    return null;
  }
}

function filterAssets(all: Asset[], state: string | undefined, site: string | undefined, q: string | undefined): Asset[] {
  const stateF = state && state !== "all" ? state : null;
  const siteF = site && site !== "all" ? site : null;
  const qF = q?.toLowerCase().trim() ?? "";
  return all.filter((a) => {
    if (stateF && a.state !== stateF) return false;
    if (siteF && a.location.site !== siteF) return false;
    if (qF) {
      const hay = [a.asset_tag, a.serial, a.custodian, a.model].join(" ").toLowerCase();
      if (!hay.includes(qF)) return false;
    }
    return true;
  });
}

function thirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 86400_000);
}
function fourteenDaysAgo(): Date {
  return new Date(Date.now() - 14 * 86400_000);
}

function emptyMessage(params: Record<string, string | undefined>): string {
  const state = params.state && params.state !== "all" ? params.state.replace("_", " ") : null;
  const site = params.site && params.site !== "all" ? params.site : null;
  const q = params.q?.trim();
  if (q) return `Nothing matches "${q}"${state ? ` in ${state} assets` : ""}${site ? ` at ${site}` : ""}. Clear the search or widen the state filter.`;
  if (state && site) return `No ${state} assets at ${site}. Either nothing's been ${state} there lately, or the filter is too narrow.`;
  if (state) return `No assets are currently in '${state}' state. Try a different filter or check whether the system is healthy.`;
  if (site) return `No assets found at ${site}. Either the site is empty or the data hasn't synced yet.`;
  return "No assets match these filters. Clear them to see everything.";
}

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const [assets, report] = await Promise.all([api.assets.list({}), fetchReport()]);

  const longStored = assets.filter((a) => a.state === "stored" && new Date(a.updated_at) < thirtyDaysAgo()).length;
  const oldRma = assets.filter((a) => a.state === "rma_pending" && new Date(a.updated_at) < fourteenDaysAgo()).length;

  // Build a tag → drift-card map so each row can show a dot if it has a problem somewhere else.
  const driftByTag = new Map<string, DriftCard>();
  if (report) {
    for (const tier of [report.tiers.today, report.tiers.this_week, report.tiers.watch]) {
      for (const card of tier) driftByTag.set(card.asset_tag, card);
    }
  }

  const filtered = filterAssets(assets, params.state, params.site, params.q);
  const page = Number(params.page ?? "1");
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ manager</div>
        <h1 className="text-2xl font-semibold mt-1">Assets</h1>
        <p className="text-sm text-neutral-600 mt-1">{assets.length.toLocaleString()} total</p>
      </header>

      {report ? <MorningBands report={report} longStored={longStored} oldRma={oldRma} /> : null}

      <ManagerFilters />

      <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Tag</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">State</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Site</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Custodian</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-neutral-500">
                  {emptyMessage(params)}
                </td>
              </tr>
            ) : (
              visible.map((a) => {
                const drift = driftByTag.get(a.asset_tag);
                const dotColor =
                  drift?.tier === "today" ? "bg-red-500" :
                  drift?.tier === "this_week" ? "bg-amber-500" :
                  drift?.tier === "watch" ? "bg-neutral-400" : "";
                return (
                  <tr key={a.asset_tag} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        {drift ? (
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`}
                            aria-label={`drift: ${staticLabelFor(drift.category)}`}
                            title={staticLabelFor(drift.category)}
                          />
                        ) : (
                          <span className="inline-block w-1.5 h-1.5" />
                        )}
                        <Tag value={a.asset_tag} href={`/manager/assets/${a.asset_tag}`} />
                      </span>
                    </td>
                    <td className="px-3 py-2"><StatePill state={a.state} /></td>
                    <td className="px-3 py-2 text-neutral-700">{a.location.site}</td>
                    <td className="px-3 py-2 text-neutral-700 font-mono text-xs">{a.custodian}</td>
                    <td className="px-3 py-2 text-neutral-500 text-xs">{relativeTime(a.updated_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {hasMore ? (
          <div className="border-t border-neutral-200 bg-neutral-50 p-3 flex justify-center">
            <a href={`?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`} className="text-xs text-neutral-700 hover:underline">
              Load {Math.min(PAGE_SIZE, filtered.length - visible.length)} more · {visible.length} of {filtered.length}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
