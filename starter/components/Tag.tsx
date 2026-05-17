import Link from "next/link";
import clsx from "clsx";

export function Tag({
  value,
  href,
  className,
}: {
  value: string;
  href?: string;
  className?: string;
}): React.ReactElement {
  const cls = clsx("font-mono font-semibold tabular-nums", className);
  if (href) {
    return (
      <Link href={href} className={clsx(cls, "underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-700")}>
        {value}
      </Link>
    );
  }
  return <span className={cls}>{value}</span>;
}
