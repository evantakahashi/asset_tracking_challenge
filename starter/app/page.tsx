import Link from "next/link";

export default function HomePage(): React.ReactElement {
  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold">Asset tracking</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Operational view across ops, facilities, and finance. Use the role switcher to flip between the tech scan workflows and the manager dashboard.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tech" className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400">
          <div className="font-medium">Tech</div>
          <div className="text-xs text-neutral-500 mt-1">Mobile scan workflows.</div>
        </Link>
        <Link href="/manager" className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400">
          <div className="font-medium">Manager</div>
          <div className="text-xs text-neutral-500 mt-1">Asset list, detail, reconciliation.</div>
        </Link>
      </div>

      <div className="text-xs text-neutral-500">
        Dev tools: <Link href="/dev/barcodes" className="underline">printable barcodes</Link>
      </div>
    </div>
  );
}
