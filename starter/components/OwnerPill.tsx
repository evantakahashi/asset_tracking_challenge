// starter/components/OwnerPill.tsx
import Link from "next/link";
import clsx from "clsx";
import type { Owner } from "@/lib/reconcile/labels";

const OWNER_STYLE: Record<Owner, string> = {
  tech:        "bg-blue-50 text-blue-700 border-blue-200",
  facilities:  "bg-purple-50 text-purple-700 border-purple-200",
  procurement: "bg-amber-50 text-amber-800 border-amber-200",
  finance:     "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export function OwnerPill({ owner, asLink = true }: { owner: Owner; asLink?: boolean }): React.ReactElement {
  const base = clsx(
    "inline-block text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider font-medium font-mono",
    OWNER_STYLE[owner],
  );
  if (asLink) {
    return <Link href={`/manager?owner=${owner}`} className={`${base} hover:opacity-80`} aria-label={`Filter to ${owner} items`}>{owner}</Link>;
  }
  return <span className={base}>{owner}</span>;
}
