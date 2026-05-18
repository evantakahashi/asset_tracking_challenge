import clsx from "clsx";
import { Tag } from "@/components/Tag";
import type { DriftCard as DriftCardType } from "@/lib/reconcile/types";
import { labelFor } from "@/lib/reconcile/labels";

const TIER_BAR: Record<string, string> = {
  today: "bg-red-600",
  this_week: "bg-amber-500",
  watch: "bg-neutral-500",
};

export function DriftCard({ card }: { card: DriftCardType }): React.ReactElement {
  const showContext = card.context && card.category !== "stale_rack_obs";
  return (
    <div id={card.category} className="flex gap-3 bg-white border border-neutral-200 rounded-md p-3">
      <div className={clsx("w-1 self-stretch rounded-sm", TIER_BAR[card.tier])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif italic text-sm font-semibold truncate">{labelFor(card)}</span>
          </div>
          <Tag value={card.asset_tag} href={`/manager/assets/${card.asset_tag}`} className="text-xs shrink-0" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <View label="Ops" view={card.views.ops} />
          <View label="Facilities" view={card.views.facilities} />
          <View label="Finance" view={card.views.finance} />
        </div>
        <div className="text-xs text-neutral-700 mt-2">
          <span className="font-semibold">Action:</span> {card.action}
        </div>
        {card.ambiguity ? (
          <div className="font-serif italic text-[11px] text-neutral-500 mt-2 leading-snug">
            {card.ambiguity}
          </div>
        ) : null}
        {showContext ? <div className="text-[10px] text-neutral-500 mt-1">{card.context}</div> : null}
        {typeof card.age_days === "number" && card.category !== "stale_rack_obs" && card.category !== "disposed_but_capitalized" ? (
          <div className="text-[10px] text-neutral-400 mt-1">{ageLabel(card.age_days)}</div>
        ) : null}
      </div>
    </div>
  );
}

function View({ label, view }: { label: string; view: { display: string } | null }): React.ReactElement {
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-medium font-mono">{label}</div>
      <div className="font-mono text-[11px] text-neutral-800">{view?.display ?? "—"}</div>
    </div>
  );
}

function ageLabel(days: number): string {
  if (days < 1) return "First seen today";
  if (days === 1) return "First seen yesterday";
  if (days < 14) return `First seen ${days} days ago`;
  if (days < 60) return `First seen ${Math.floor(days / 7)} weeks ago`;
  return `First seen ${Math.floor(days / 30)} months ago`;
}
