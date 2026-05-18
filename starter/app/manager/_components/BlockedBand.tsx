// starter/app/manager/_components/BlockedBand.tsx
import Link from "next/link";

export function BlockedBand({
  longReceived,
  longStored,
  oldRma,
}: {
  longReceived: number;
  longStored: number;
  oldRma: number;
}): React.ReactElement | null {
  const total = longReceived + longStored + oldRma;
  if (total === 0) return null;

  return (
    <section className="border-l-2 border-neutral-700 pl-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-700 font-semibold mb-2">
        Blocked · {total}
      </div>
      <ul className="space-y-1.5 text-sm font-serif text-neutral-700">
        {longReceived > 0 ? (
          <li>
            <Link href="/manager?state=received&expanded=true" className="hover:underline">
              <strong className="font-sans font-semibold not-italic">{longReceived}</strong> {longReceived === 1 ? "asset" : "assets"} received over 24h ago without store or deploy
            </Link>
          </li>
        ) : null}
        {longStored > 0 ? (
          <li>
            <Link href="/manager?state=stored&expanded=true" className="hover:underline">
              <strong className="font-sans font-semibold not-italic">{longStored}</strong> {longStored === 1 ? "asset" : "assets"} stored over 30 days
            </Link>
          </li>
        ) : null}
        {oldRma > 0 ? (
          <li>
            <Link href="/manager?state=rma_pending&expanded=true" className="hover:underline">
              <strong className="font-sans font-semibold not-italic">{oldRma}</strong> {oldRma === 1 ? "asset" : "assets"} in RMA staging over 14d
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
