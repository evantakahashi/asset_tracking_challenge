import Link from "next/link";

const TILES = [
  { href: "/tech/receive", title: "Receive", subtitle: "Dock-side scan. New tag or duplicate." },
  { href: "/tech/store", title: "Store", subtitle: "Move to a shelf." },
  { href: "/tech/deploy", title: "Deploy", subtitle: "Into a rack. Rack + RU required." },
  { href: "/tech/transfer", title: "Transfer", subtitle: "Custody handoff. State doesn't change." },
];

export default function TechLandingPage(): React.ReactElement {
  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">/ tech</div>
        <h1 className="text-2xl font-semibold mt-1">What are you scanning?</h1>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-neutral-400 hover:shadow-sm transition"
          >
            <div className="font-medium">{t.title}</div>
            <div className="text-xs text-neutral-500 mt-1">{t.subtitle}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
