"use client";
import { useEffect, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import bwipjs from "bwip-js";

const ASSET_TAGS = [
  { tag: "C0000101", note: "in_service, all clean" },
  { tag: "C0000110", note: "mislocated (planted)" },
  { tag: "C0000108", note: "RMA + ghost on rack" },
  { tag: "C0000109", note: "disposed + ghost + disposed_but_capitalized" },
  { tag: "C0000107", note: "off the books" },
  { tag: "C0000113", note: "ghost on the books" },
  { tag: "C0000199", note: "orphan in facilities" },
  { tag: "C0009001", note: "fresh — for receive demo" },
  { tag: "C0009002", note: "fresh — for receive demo" },
  { tag: "C0009003", note: "fresh — for receive demo" },
];

const LOCATIONS = [
  "Lab-Building-A/Receiving/DOCK-1",
  "Lab-Building-A/Receiving/DOCK-2",
  "Lab-Building-A/Storage-1/SHELF-3",
  "Lab-Building-A/Storage-2/SHELF-1",
  "Lab-Building-A/Bay-12/Aisle-3/B-04/U05",
  "Lab-Building-A/Bay-12/Aisle-3/B-04/U06",
  "Lab-Building-A/Telecom-1/Aisle-1/T-01/U40",
  "Lab-Building-B/Computing-1/Aisle-1/C-12/U18",
];

const BADGES = ["tech-jane", "tech-mike", "tech-carlos", "tech-priya", "tech-aaron", "manager-paul"];

function Barcode({ value }: { value: string }): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      bwipjs.toCanvas(ref.current, {
        bcid: "code128",
        text: value,
        scale: 4,
        height: 18,
        includetext: false,
        backgroundcolor: "FFFFFF",
        paddingwidth: 8,
        paddingheight: 8,
      });
    } catch {
      // bwipjs is forgiving; ignore failures gracefully
    }
  }, [value]);
  return <canvas ref={ref} />;
}

export default function BarcodesPage(): React.ReactElement {
  return (
    <div className="space-y-8 max-w-4xl print:max-w-none">
      <div className="print:hidden">
        <PageHeader
          crumb="/ dev / barcodes"
          title="Demo barcodes"
          titleVariant="editorial"
          subtitle="Print this page or scan directly from the screen. Code 128 throughout — works with handheld scanners and phone cameras via the in-app scanner."
        />
        <button onClick={() => window.print()} className="mt-3 px-4 py-1.5 text-sm rounded-md border border-neutral-300 bg-white hover:bg-neutral-50">
          Print
        </button>
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-3">Assets</h2>
        <div className="grid grid-cols-2 gap-4">
          {ASSET_TAGS.map((a) => (
            <div key={a.tag} className="border border-neutral-200 rounded p-3 bg-white">
              <Barcode value={a.tag} />
              <div className="mt-2 font-mono text-sm font-semibold">{a.tag}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{a.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Locations</h2>
        <div className="grid grid-cols-2 gap-4">
          {LOCATIONS.map((l) => (
            <div key={l} className="border border-neutral-200 rounded p-3 bg-white">
              <Barcode value={l} />
              <div className="mt-2 font-mono text-[11px] break-all">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Badges</h2>
        <div className="grid grid-cols-3 gap-4">
          {BADGES.map((b) => (
            <div key={b} className="border border-neutral-200 rounded p-3 bg-white">
              <Barcode value={b} />
              <div className="mt-2 font-mono text-sm">{b}</div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:max-w-none { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
