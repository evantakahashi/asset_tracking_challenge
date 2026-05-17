import Link from "next/link";

export default function HomePage(): React.ReactElement {
  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <p className="font-serif italic text-3xl leading-tight tracking-tight text-neutral-900">
          Three teams. Three records. The same instruments. Reconciled.
        </p>
        <p className="text-sm text-neutral-600 mt-4 max-w-xl">
          At 8:55am Monday, the asset manager opens this to see what needs human attention.
          At 11pm in the dock bay, a lab tech scans a new arrival.
          This is where those workflows live.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tech" className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400">
          <div className="font-serif text-base">Tech</div>
          <div className="text-xs text-neutral-500 mt-1">Mobile scan workflows.</div>
        </Link>
        <Link href="/manager" className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400">
          <div className="font-serif text-base">Manager</div>
          <div className="text-xs text-neutral-500 mt-1">Asset list, detail, reconciliation.</div>
        </Link>
      </div>

      <div className="text-xs text-neutral-500">
        Dev tools: <Link href="/dev/barcodes" className="underline">printable barcodes</Link>
      </div>
    </div>
  );
}
