import type { Asset } from "@/lib/types";
import { Tag } from "../Tag";
import { StatePill } from "../StatePill";
import { formatLocationShort, relativeTime } from "@/lib/format";

export function ScanReceipt({
  asset,
  verb,
  detail,
  warnings,
}: {
  asset: Asset;
  verb: string;
  detail?: string;
  warnings?: string[];
}): React.ReactElement {
  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-4">
      <div className="h-0.5 bg-green-600 -mx-4 -mt-4 mb-3" />
      <div className="flex items-center justify-between">
        <span className="text-green-800 font-medium text-sm">{verb}</span>
        <StatePill state={asset.state} />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <Tag value={asset.asset_tag} />
        <span className="text-xs text-neutral-500">{relativeTime(asset.updated_at)}</span>
      </div>
      <div className="mt-1 text-xs text-neutral-700">{asset.model} · <span className="font-mono">{asset.serial}</span></div>
      <div className="mt-2 text-xs text-neutral-600">
        {detail ?? `at ${formatLocationShort(asset.location)} · ${asset.custodian}`}
      </div>
      {warnings && warnings.length > 0 ? (
        <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
