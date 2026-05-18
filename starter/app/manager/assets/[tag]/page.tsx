import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { StatePill } from "@/components/StatePill";
import { EventTimeline } from "./_components/EventTimeline";
import { relativeTime } from "@/lib/format";
import { serializeLocation } from "@/lib/location";
import type { FacilitiesRecord, FinanceRecord } from "@/lib/types";

export default async function ManagerAssetDetailPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<React.ReactElement> {
  const { tag } = await params;
  let asset, events, facilities, finance;
  try {
    [asset, events, facilities, finance] = await Promise.all([
      api.assets.get(tag),
      api.assets.history(tag),
      api.mock.facilities(),
      api.mock.finance(),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === "unknown_asset") notFound();
    throw e;
  }

  const fac: FacilitiesRecord | undefined = facilities.find((f) => f.tagged_id === tag);
  const fin: FinanceRecord | undefined = finance.find((f) => f.tag === tag);

  const opsRack = asset.location.rack && asset.location.ru ? `${asset.location.rack}/${asset.location.ru}` : null;
  const facRack = fac ? fac.rack_location.split("/").slice(-2).join("/") : null;
  const hasDrift = opsRack && facRack && opsRack !== facRack;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/manager" className="text-xs text-neutral-500 hover:text-neutral-700">← Assets</Link>
      </div>

      <PageHeader
        crumb={`/ manager / assets / ${asset.asset_tag}`}
        title={<span className="font-mono">{asset.asset_tag}</span>}
        subtitle={`${asset.model} · ${asset.serial}`}
      />

      {/* Compact state strip (one line) */}
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <StatePill state={asset.state} />
        <span className="text-neutral-700">held by <span className="font-mono">{asset.custodian}</span></span>
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-700">at <span className="font-mono text-xs">{serializeLocation(asset.location)}</span></span>
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-500 text-xs">updated {relativeTime(asset.updated_at)}</span>
      </div>

      {/* Procurement note */}
      {asset.procurement_note ? (
        <section className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-900">
          <div className="text-[10px] uppercase tracking-wider text-yellow-800 font-medium mb-1 font-mono">Procurement note</div>
          {asset.procurement_note}
        </section>
      ) : null}

      {/* Subtraction notice — read-only by design */}
      <div className="border-l-2 border-neutral-300 pl-3 text-xs text-neutral-500 italic font-serif">
        Read-only by design. Drift resolves via physical scan (techs) or in the owning system (facilities, finance) — there&apos;s no manager-side write button.{" "}
        {hasDrift ? <Link href="/manager" className="not-italic underline">See the action list →</Link> : null}
      </div>

      {/* EVENT HISTORY — the lede */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 font-semibold mb-3">
          Event history · {events.length}
        </h2>
        <EventTimeline events={events} />
      </section>

      {/* DETAILS — below the fold */}
      <section className="border-t border-neutral-200 pt-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 font-semibold mb-3">Details</h2>

        {/* Three-system snapshot */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-neutral-200 rounded-md p-3">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2 font-mono">Ops</div>
            <StatePill state={asset.state} />
            <div className="text-xs mt-2 font-mono">{opsRack ?? asset.location.room}</div>
            <div className="text-[10px] text-neutral-400 mt-1">updated {relativeTime(asset.updated_at)}</div>
          </div>
          <div className={`bg-white border rounded-md p-3 ${hasDrift ? "border-amber-300 bg-amber-50" : "border-neutral-200"}`}>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2 font-mono">Facilities</div>
            {fac ? (
              <>
                <div className="text-xs font-mono">{facRack}</div>
                {hasDrift ? <div className="text-[10px] text-amber-800 mt-1">⚠ disagrees with ops</div> : null}
                <div className="text-[10px] text-neutral-400 mt-1">last seen {relativeTime(fac.last_observed)}</div>
              </>
            ) : (
              <div className="text-xs text-neutral-500">— not tracked</div>
            )}
          </div>
          <div className="bg-white border border-neutral-200 rounded-md p-3">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2 font-mono">Finance</div>
            {fin ? (
              <>
                <div className="text-xs">{fin.status}</div>
                <div className="text-[10px] text-neutral-500 mt-1 font-mono">${fin.book_value_usd.toLocaleString()}</div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  {fin.capitalized_on ? `as of ${fin.capitalized_on}` : "not yet capitalized"}
                </div>
              </>
            ) : (
              <div className="text-xs text-neutral-500">— missing</div>
            )}
          </div>
        </div>

        {/* Compact metadata list */}
        <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1 text-xs text-neutral-700">
          <dt className="text-neutral-500">Asset class</dt><dd className="font-mono">{asset.asset_class}</dd>
          <dt className="text-neutral-500">Manufacturer</dt><dd>{asset.manufacturer}</dd>
          <dt className="text-neutral-500">Parent tag</dt><dd className="font-mono">{asset.parent_asset_tag ?? "—"}</dd>
          <dt className="text-neutral-500">Created</dt><dd className="font-mono">{asset.created_at}</dd>
        </dl>
      </section>
    </div>
  );
}
