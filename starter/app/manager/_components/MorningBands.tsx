import Link from "next/link";
import type { ReconcileReport } from "@/lib/reconcile/types";

function categoryLabel(c: string): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function categoryCounts(cards: { category: string }[]): { category: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of cards) map.set(c.category, (map.get(c.category) ?? 0) + 1);
  return Array.from(map.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

export function MorningBands({ report, longStored, oldRma }: { report: ReconcileReport; longStored: number; oldRma: number }): React.ReactElement {
  const todayCats = categoryCounts(report.tiers.today);
  const weekCats = categoryCounts(report.tiers.this_week);

  return (
    <div className="space-y-3">
      {todayCats.length > 0 ? (
        <div className="bg-neutral-50 border-l-4 border-red-600 rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-red-700 font-semibold mb-2">Look at this morning</div>
          <ul className="space-y-1.5">
            {todayCats.map((c) => (
              <li key={c.category} className="flex justify-between items-center text-sm">
                <Link href={`/manager/reconcile#${c.category}`} className="text-neutral-700 hover:underline">
                  <span className="font-mono text-red-700 font-semibold mr-2">{c.count}</span>
                  {categoryLabel(c.category)}
                </Link>
                <span className="text-[10px] text-neutral-500">→ reconcile</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weekCats.length > 0 || longStored > 0 || oldRma > 0 ? (
        <div className="bg-neutral-50 border-l-4 border-neutral-400 rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-2">This week</div>
          <ul className="space-y-1.5">
            {weekCats.map((c) => (
              <li key={c.category} className="flex justify-between items-center text-sm">
                <Link href={`/manager/reconcile#${c.category}`} className="text-neutral-700 hover:underline">
                  <span className="font-mono text-neutral-700 font-semibold mr-2">{c.count}</span>
                  {categoryLabel(c.category)}
                </Link>
                <span className="text-[10px] text-neutral-500">→ reconcile</span>
              </li>
            ))}
            {longStored > 0 ? (
              <li className="flex justify-between items-center text-sm">
                <Link href="/manager?state=stored" className="text-neutral-700 hover:underline">
                  <span className="font-mono text-neutral-700 font-semibold mr-2">{longStored}</span>
                  Stored over 30 days
                </Link>
                <span className="text-[10px] text-neutral-500">→ filter list</span>
              </li>
            ) : null}
            {oldRma > 0 ? (
              <li className="flex justify-between items-center text-sm">
                <Link href="/manager?state=rma_pending" className="text-neutral-700 hover:underline">
                  <span className="font-mono text-neutral-700 font-semibold mr-2">{oldRma}</span>
                  RMA past 14 days
                </Link>
                <span className="text-[10px] text-neutral-500">→ filter list</span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
