import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Tag } from "@/components/Tag";
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

      <header className="bg-white border border-neutral-200 rounded-md p-5">
        <div className="flex items-baseline justify-between">
          <Tag value={asset.asset_tag} className="text-xl" />
          <StatePill state={asset.state} />
        </div>
        <div className="mt-1 text-base text-neutral-800">{asset.model}</div>
        <div className="text-xs text-neutral-500 font-mono">{asset.serial} · {asset.manufacturer}</div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div className="text-neutral-500 text-xs uppercase tracking-wider">Location</div>
          <div className="font-mono text-xs">{serializeLocation(asset.location)}</div>
          <div className="text-neutral-500 text-xs uppercase tracking-wider">Custodian</div>
          <div className="font-mono text-xs">{asset.custodian}</div>
          <div className="text-neutral-500 text-xs uppercase tracking-wider">Updated</div>
          <div className="text-xs">{relativeTime(asset.updated_at)} · <span className="text-neutral-500">{asset.updated_at}</span></div>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-neutral-200 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Ops</div>
          <StatePill state={asset.state} />
          <div className="text-xs mt-2 font-mono">{opsRack ?? asset.location.room}</div>
          <div className="text-[10px] text-neutral-400 mt-1">updated {relativeTime(asset.updated_at)}</div>
        </div>
        <div className={`bg-white border rounded-md p-3 ${hasDrift ? "border-amber-300 bg-amber-50" : "border-neutral-200"}`}>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Facilities</div>
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
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Finance</div>
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
      </section>

      {asset.procurement_note ? (
        <section className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-900">
          <div className="text-[10px] uppercase tracking-wider text-yellow-800 font-medium mb-1">Procurement note</div>
          {asset.procurement_note}
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold mb-3">Event history ({events.length})</h2>
        <EventTimeline events={events} />
      </section>
    </div>
  );
}
