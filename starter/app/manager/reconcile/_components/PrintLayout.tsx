import { cookies } from "next/headers";
import type { DriftCard, ReconcileReport } from "@/lib/reconcile/types";
import { labelFor } from "@/lib/reconcile/labels";

function dateFor(now: Date): string {
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function timeFor(now: Date): string {
  return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
}

function shortRack(loc: string | undefined | null): string {
  if (!loc) return "—";
  const parts = loc.split("/");
  if (parts.length >= 5) return `${parts[3]}/${parts[4]}`;
  return loc;
}

function summary(card: DriftCard): string {
  const ops = card.views.ops?.display ?? "—";
  const fac = card.views.facilities?.display ?? "—";
  const fin = card.views.finance?.display ?? "—";
  switch (card.category) {
    case "mislocated":
      return `ops ${ops} · facilities ${shortRack(fac)} · finance ${fin}`;
    case "ghost_on_rack":
      return `ops ${ops} · facilities ${shortRack(fac)} · finance ${fin}`;
    case "orphan_on_rack":
      return `ops — · facilities ${shortRack(fac)} · finance —`;
    case "off_books":
      return `ops ${ops} · facilities — · finance missing`;
    case "ghost_on_books":
      return `ops — · facilities — · finance ${fin}`;
    case "disposed_but_capitalized":
      return `ops disposed · facilities — · finance ${fin}`;
    case "stale_rack_obs":
      return `ops ${ops} · facilities last observed ${card.context?.toLowerCase() ?? "long ago"}`;
  }
}

function Section({ title, color, items, startIdx }: { title: string; color: "red" | "amber" | "neutral"; items: DriftCard[]; startIdx: number }): React.ReactElement | null {
  if (items.length === 0) return null;
  const colorClass =
    color === "red" ? "text-red-700 border-red-700" :
    color === "amber" ? "text-amber-700 border-amber-700" :
    "text-neutral-600 border-neutral-600";
  return (
    <section className="mt-6">
      <h2 className={`font-mono text-[10px] uppercase tracking-[0.1em] font-semibold border-b pb-1 mb-3 ${colorClass}`}>
        {title} · {items.length}
      </h2>
      <ol className="space-y-3">
        {items.map((c, i) => (
          <li key={`${c.asset_tag}-${i}`} className="grid grid-cols-[2rem_1fr_8rem] gap-3 break-inside-avoid pb-2 border-b border-dotted border-neutral-300">
            <span className="font-mono text-[11px] font-semibold text-neutral-500">{startIdx + i + 1}.</span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif italic text-[13px] font-semibold">{labelFor(c)}</span>
                <span className="font-mono text-[11px] font-semibold ml-auto">{c.asset_tag}</span>
              </div>
              <div className="font-mono text-[10px] text-neutral-600 mt-1">{summary(c)}</div>
              <div className="text-[11px] mt-1"><span className="font-semibold">Action:</span> {c.action}</div>
              <div className="font-serif italic text-[10px] text-neutral-600 mt-2">
                Resolved by <span className="inline-block w-32 border-b border-neutral-500" /> on <span className="inline-block w-24 border-b border-neutral-500" />
              </div>
            </div>
            <div className="font-mono text-[10px] text-neutral-600 text-right">
              <span className="inline-block w-2.5 h-2.5 border border-neutral-500 align-middle mr-1" />
              resolved
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function PrintLayout({ report }: { report: ReconcileReport }): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const role = cookieStore.get("asset-challenge-role")?.value;
  const generatedBy = role === "manager" ? "manager-paul" : role === "tech" ? "tech-jane" : "asset-tracking-app";
  const now = new Date(report.generated_at);

  const total = report.counts.today + report.counts.this_week + report.counts.watch;

  return (
    <div className="hidden print:block px-10 py-8 text-neutral-900">
      <header className="flex justify-between items-end pb-3 border-b-2 border-neutral-900">
        <div>
          <h1 className="font-serif italic text-2xl font-semibold">Reconciliation report</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-neutral-600 mt-1">
            {dateFor(now)} · for the Monday standup
          </p>
        </div>
        <div className="font-mono text-[10px] text-neutral-600 text-right space-y-0.5">
          <div>generated {timeFor(now)}</div>
          <div>by {generatedBy}</div>
        </div>
      </header>

      {total > 0 ? (
        <p className="font-serif italic text-[14px] leading-relaxed mt-5">
          Across {(total + report.counts.expected).toLocaleString()} tracked assets,{" "}
          <strong className="not-italic">{report.counts.today}</strong> require investigation today,{" "}
          <strong className="not-italic">{report.counts.this_week}</strong> this week, and{" "}
          <strong className="not-italic">{report.counts.watch}</strong>{" "}
          {report.counts.watch === 1 ? "is" : "are"} on the watch list. Each item has a recommended action and a signature line for the team member who resolves it.
        </p>
      ) : (
        <p className="font-serif italic text-[14px] mt-5">
          All tracked assets agree across operations, facilities, and finance today. This is suspicious — when did you last reset?
        </p>
      )}

      <Section title="Investigate today" color="red" items={report.tiers.today} startIdx={0} />
      <Section title="Investigate this week" color="amber" items={report.tiers.this_week} startIdx={report.tiers.today.length} />
      <Section title="Worth knowing" color="neutral" items={report.tiers.watch} startIdx={report.tiers.today.length + report.tiers.this_week.length} />

      <footer className="mt-10 pt-3 border-t border-neutral-400 flex justify-between font-mono text-[9px] text-neutral-600 tracking-wider">
        <span>asset-tracking · sunnyvale operations · CONFIDENTIAL — internal use</span>
        <span className="font-serif italic text-[11px]">
          Manager sign-off <span className="inline-block w-36 border-b border-neutral-500" />
        </span>
      </footer>
    </div>
  );
}
