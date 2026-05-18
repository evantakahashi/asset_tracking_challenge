import Link from "next/link";
import { api } from "@/lib/api-client";
import { DriftList } from "./_components/DriftList";
import { BrowseAllAssets } from "./_components/BrowseAllAssets";
import { LastVisitBand } from "./reconcile/_components/LastVisitBand";
import { CopyForStandupButton } from "./reconcile/_components/CopyForStandupButton";
import { BlockedBand } from "./_components/BlockedBand";
import { computeReconcileReport } from "@/lib/reconcile/compute";
import type { Asset } from "@/lib/types";
import type { ReconcileReport } from "@/lib/reconcile/types";

const PAGE_SIZE = 50;

async function fetchReport(): Promise<ReconcileReport | null> {
  try {
    return await computeReconcileReport();
  } catch {
    return null;
  }
}

function parseOlderThanMs(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^(\d+)(h|d)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return match[2] === "h" ? n * 3600_000 : n * 86400_000;
}

function filterAssets(all: Asset[], state: string | undefined, site: string | undefined, q: string | undefined, olderThan: string | undefined): Asset[] {
  const stateF = state && state !== "all" ? state : null;
  const siteF = site && site !== "all" ? site : null;
  const qF = q?.toLowerCase().trim() ?? "";
  const olderThanMs = parseOlderThanMs(olderThan);
  const cutoff = olderThanMs != null ? new Date(Date.now() - olderThanMs) : null;
  return all.filter((a) => {
    if (stateF && a.state !== stateF) return false;
    if (siteF && a.location.site !== siteF) return false;
    if (cutoff && new Date(a.updated_at) >= cutoff) return false;
    if (qF) {
      const hay = [a.asset_tag, a.serial, a.custodian, a.model].join(" ").toLowerCase();
      if (!hay.includes(qF)) return false;
    }
    return true;
  });
}

function thirtyDaysAgo(): Date { return new Date(Date.now() - 30 * 86400_000); }
function fourteenDaysAgo(): Date { return new Date(Date.now() - 14 * 86400_000); }
function twentyFourHoursAgo(): Date { return new Date(Date.now() - 24 * 3600_000); }

function emptyMessage(params: Record<string, string | undefined>): string {
  const state = params.state && params.state !== "all" ? params.state.replace("_", " ") : null;
  const site = params.site && params.site !== "all" ? params.site : null;
  const q = params.q?.trim();
  if (q) return `Nothing matches "${q}"${state ? ` in ${state} assets` : ""}${site ? ` at ${site}` : ""}. Clear the search or widen the state filter.`;
  if (state && site) return `No ${state} assets at ${site}.`;
  if (state) return `No assets are currently in '${state}' state.`;
  if (site) return `No assets found at ${site}.`;
  return "No assets match these filters.";
}

function leadSentence(report: ReconcileReport | null): string {
  if (!report) return "Loading the operational view.";
  const { today: t, this_week: w, watch: v } = report.counts;
  if (t === 0 && w === 0 && v === 0) return "All tracked assets agree across operations, facilities, and finance today.";
  const spell = (n: number) => ["zero","one","two","three","four","five","six","seven","eight","nine","ten"][n] ?? String(n);
  const phrases: string[] = [];
  if (t > 0) phrases.push(`${t === 1 ? "One thing" : `${spell(t)} things`} to look at this morning`);
  if (w > 0) phrases.push(`${spell(w)} this week`);
  if (v > 0) phrases.push(`${spell(v)} to watch`);
  return phrases.join(". ") + ".";
}

function nowHeader(): string {
  return new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const [assets, report] = await Promise.all([api.assets.list({}), fetchReport()]);

  const longReceived = assets.filter((a) => a.state === "received" && new Date(a.updated_at) < twentyFourHoursAgo()).length;
  const longStored = assets.filter((a) => a.state === "stored" && new Date(a.updated_at) < thirtyDaysAgo()).length;
  const oldRma = assets.filter((a) => a.state === "rma_pending" && new Date(a.updated_at) < fourteenDaysAgo()).length;

  const filtered = filterAssets(assets, params.state, params.site, params.q, params.olderThan);
  const page = Number(params.page ?? "1");
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  const currentKeys = report
    ? [...report.tiers.today, ...report.tiers.this_week, ...report.tiers.watch].map((c) => ({ tag: c.asset_tag, category: c.category }))
    : [];

  const ownerFilter = params.owner;

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 mb-2">
          / manager · {nowHeader()}
        </div>
        <h1 className="font-serif italic text-[28px] leading-tight tracking-tight text-neutral-900 max-w-2xl">
          {leadSentence(report)}
        </h1>
      </header>

      <BlockedBand longReceived={longReceived} longStored={longStored} oldRma={oldRma} />

      {report ? <LastVisitBand current={currentKeys} /> : null}

      {report ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 sticky top-[88px] z-20 bg-neutral-50 -mx-4 px-4 py-2 border-b border-neutral-200">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 font-semibold">
              Drift · {report.counts.today + report.counts.this_week + report.counts.watch}
              {ownerFilter ? <span className="ml-2 text-neutral-700">· filtered to {ownerFilter}</span> : null}
            </div>
            <div className="flex gap-2">
              <CopyForStandupButton report={report} />
              <Link
                href="/manager/reconcile"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 px-2.5 py-1 rounded-md"
              >
                Open report →
              </Link>
            </div>
          </div>
          <DriftList report={report} ownerFilter={ownerFilter} />
        </section>
      ) : null}

      <BrowseAllAssets
        assets={assets}
        filtered={filtered}
        visible={visible}
        hasMore={hasMore}
        filteredCount={filtered.length}
        pageSize={PAGE_SIZE}
        visibleCount={visible.length}
        params={params}
        emptyMessage={emptyMessage(params)}
      />
    </div>
  );
}
