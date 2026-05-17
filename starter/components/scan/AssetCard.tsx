import type { Asset } from "@/lib/types";
import { Tag } from "../Tag";
import { StatePill } from "../StatePill";
import { formatLocationShort } from "@/lib/format";

export function AssetCard({ asset }: { asset: Asset }): React.ReactElement {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3">
      <div className="flex items-center justify-between">
        <Tag value={asset.asset_tag} />
        <StatePill state={asset.state} />
      </div>
      <div className="mt-1 text-sm text-neutral-700">{asset.model}</div>
      <div className="mt-1 text-xs text-neutral-500 font-mono">{asset.serial}</div>
      <div className="mt-2 text-xs text-neutral-500">
        At {formatLocationShort(asset.location)} · held by <span className="font-mono">{asset.custodian}</span>
      </div>
    </div>
  );
}
