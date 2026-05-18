// starter/app/manager/_components/DriftList.tsx
import Link from "next/link";
import clsx from "clsx";
import { Tag } from "@/components/Tag";
import { OwnerPill } from "@/components/OwnerPill";
import { labelFor, CATEGORY_OWNER } from "@/lib/reconcile/labels";
import type { DriftCard, ReconcileReport } from "@/lib/reconcile/types";

const TIER_BAR: Record<string, string> = {
  today: "bg-red-600",
  this_week: "bg-amber-500",
  watch: "bg-neutral-500",
};

function ageLabel(days: number | null | undefined): string {
  if (days == null) return "";
  if (days < 1) return "today";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function summary(card: DriftCard): string {
  const ops = card.views.ops?.display ?? "—";
  const fac = card.views.facilities?.display ?? "—";
  const fin = card.views.finance?.display ?? "—";
  return `ops ${ops} · fac ${fac} · fin ${fin}`;
}

function DriftRow({ card }: { card: DriftCard }): React.ReactElement {
  const owner = CATEGORY_OWNER[card.category];
  return (
    <div className="flex gap-3 px-1 py-3 border-b border-neutral-100 last:border-b-0">
      <div className={clsx("w-0.5 self-stretch rounded-sm shrink-0", TIER_BAR[card.tier])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3 min-w-0">
            <Tag value={card.asset_tag} href={`/manager/assets/${card.asset_tag}`} className="text-sm" />
            <span className="font-serif italic text-sm font-semibold text-neutral-900 truncate">{labelFor(card)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <OwnerPill owner={owner} />
            {typeof card.age_days === "number" ? (
              <span className="font-mono text-[10px] text-neutral-400">{ageLabel(card.age_days)}</span>
            ) : null}
          </div>
        </div>
        <div className="font-mono text-[11px] text-neutral-600 mt-1 break-words">{summary(card)}</div>
        <div className="text-xs text-neutral-700 mt-1">→ {card.action}</div>
      </div>
    </div>
  );
}

function Section({ title, count, color, items }: { title: string; count: number; color: "red" | "amber" | "neutral"; items: DriftCard[] }): React.ReactElement | null {
  if (items.length === 0) return null;
  const colorClass = color === "red" ? "text-red-700" : color === "amber" ? "text-amber-700" : "text-neutral-600";
  return (
    <section>
      <div className={clsx("font-mono text-[10px] uppercase tracking-[0.1em] font-semibold mb-2", colorClass)}>
        {title} · {count}
      </div>
      <div>
        {items.map((c, i) => <DriftRow key={`${c.category}-${c.asset_tag}-${i}`} card={c} />)}
      </div>
    </section>
  );
}

export function DriftList({ report, ownerFilter }: { report: ReconcileReport; ownerFilter?: string }): React.ReactElement {
  const applyFilter = (items: DriftCard[]) =>
    ownerFilter ? items.filter((c) => CATEGORY_OWNER[c.category] === ownerFilter) : items;

  const today = applyFilter(report.tiers.today);
  const week = applyFilter(report.tiers.this_week);
  const watch = applyFilter(report.tiers.watch);
  const total = today.length + week.length + watch.length;

  if (total === 0 && ownerFilter) {
    return (
      <div className="text-sm text-neutral-500 py-6 text-center">
        No drift items owned by <strong className="text-neutral-700">{ownerFilter}</strong> right now. <Link href="/manager" className="underline">Show all owners</Link>
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className="text-sm text-neutral-500 py-6 text-center">
        All tracked assets agree across operations, facilities, and finance today.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Today" count={today.length} color="red" items={today} />
      <Section title="This week" count={week.length} color="amber" items={week} />
      <Section title="Watch" count={watch.length} color="neutral" items={watch} />
    </div>
  );
}
