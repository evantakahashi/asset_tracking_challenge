import Link from "next/link";
import type { DriftCategory, DriftCard, ReconcileReport } from "@/lib/reconcile/types";
import { staticLabelFor } from "@/lib/reconcile/labels";

function categoryCounts(cards: { category: DriftCategory }[]): { category: DriftCategory; count: number }[] {
  const map = new Map<DriftCategory, number>();
  for (const c of cards) map.set(c.category, (map.get(c.category) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

function joinClauses(cats: { category: DriftCategory; count: number }[]): string {
  const parts = cats.map((c) => `${c.count} ${staticLabelFor(c.category).toLowerCase()}`);
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return parts.join(" and ");
  return parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
}

function tagList(cards: DriftCard[], max = 4): string {
  const tags = cards.slice(0, max).map((c) => c.asset_tag);
  const more = cards.length > max ? `, and ${cards.length - max} more` : "";
  return tags.join(", ") + more;
}

export function MorningBands({
  report,
  longStored,
  oldRma,
}: {
  report: ReconcileReport;
  longStored: number;
  oldRma: number;
}): React.ReactElement {
  const todayCats = categoryCounts(report.tiers.today);
  const todayCount = report.tiers.today.length;
  const weekCats = categoryCounts(report.tiers.this_week);
  const weekCount = report.tiers.this_week.length;
  const watchCount = report.tiers.watch.length;
  const hasAnyThisWeek = weekCount > 0 || longStored > 0 || oldRma > 0;

  return (
    <div className="space-y-5">
      {todayCount > 0 ? (
        <section className="border-l-2 border-red-600 pl-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-red-700 font-semibold mb-2">
            Today · investigate · {todayCount}
          </div>
          <p className="font-serif text-[15px] leading-relaxed text-neutral-800">
            <span className="italic">{joinClauses(todayCats)}</span> — {tagList(report.tiers.today)}.{" "}
            <Link href="/manager/reconcile" className="italic underline decoration-neutral-300 hover:decoration-neutral-700">
              Walk to /manager/reconcile.
            </Link>
          </p>
        </section>
      ) : null}

      {hasAnyThisWeek ? (
        <section className="border-l-2 border-amber-500 pl-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-2">
            This week · {weekCount + (longStored > 0 ? 1 : 0) + (oldRma > 0 ? 1 : 0)}
          </div>
          <p className="font-serif text-[14px] leading-relaxed text-neutral-700">
            {weekCount > 0 ? <span><span className="italic">{joinClauses(weekCats)}</span>. </span> : null}
            {longStored > 0 ? <span>{longStored} stored over 30 days. </span> : null}
            {oldRma > 0 ? <span>{oldRma} RMA past 14 days. </span> : null}
            <Link href="/manager/reconcile" className="italic underline decoration-neutral-300 hover:decoration-neutral-700">
              Filter the directory or open reconcile.
            </Link>
          </p>
        </section>
      ) : null}

      {watchCount > 0 ? (
        <section className="border-l-2 border-neutral-400 pl-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-2">
            Watch · {watchCount}
          </div>
          <p className="font-serif text-[14px] leading-relaxed text-neutral-600">
            <span className="italic">{joinClauses(categoryCounts(report.tiers.watch))}</span>.{" "}
            <Link href="/manager/reconcile" className="italic underline decoration-neutral-300 hover:decoration-neutral-700">
              Read on reconcile.
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
