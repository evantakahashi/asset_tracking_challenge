import clsx from "clsx";
import type { AssetState } from "@/lib/types";

const STYLES: Record<AssetState, string> = {
  unreceived:  "bg-neutral-100 text-neutral-500 border-neutral-200",
  received:    "bg-yellow-50 text-yellow-800 border-yellow-200",
  stored:      "bg-neutral-100 text-neutral-700 border-neutral-200",
  in_service:  "bg-green-50 text-green-800 border-green-200",
  rma_pending: "bg-orange-50 text-orange-800 border-orange-200",
  disposed:    "bg-red-50 text-red-800 border-red-200",
};

export function StatePill({ state, className }: { state: AssetState; className?: string }): React.ReactElement {
  return (
    <span
      className={clsx(
        "inline-block text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider font-medium",
        STYLES[state],
        className,
      )}
    >
      {state.replace("_", " ")}
    </span>
  );
}
