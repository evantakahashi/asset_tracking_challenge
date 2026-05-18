import { createApiClient } from "@/lib/api-client";
import { classifyDrift } from "@/lib/reconcile/classify";
import type { DriftCard, ReconcileReport } from "@/lib/reconcile/types";
import type { Asset, FacilitiesRecord, FinanceRecord } from "@/lib/types";

export async function computeReconcileReport(): Promise<ReconcileReport> {
  const api = createApiClient();
  const [assets, facilities, finance] = await Promise.all([
    api.assets.list({}),
    api.mock.facilities(),
    api.mock.finance(),
  ]);

  const opsByTag = new Map<string, Asset>(assets.map((a) => [a.asset_tag, a]));
  const facByTag = new Map<string, FacilitiesRecord>(facilities.map((f) => [f.tagged_id, f]));
  const finByTag = new Map<string, FinanceRecord>(finance.map((f) => [f.tag, f]));

  const allTags = new Set<string>([...opsByTag.keys(), ...facByTag.keys(), ...finByTag.keys()]);
  const now = new Date();

  const today: DriftCard[] = [];
  const this_week: DriftCard[] = [];
  const watch: DriftCard[] = [];
  let stored_or_received_not_racked = 0;
  let disposed_not_racked = 0;

  for (const tag of allTags) {
    const result = classifyDrift(opsByTag.get(tag) ?? null, facByTag.get(tag) ?? null, finByTag.get(tag) ?? null, now);
    if (!result) continue;
    if ("kind" in result) {
      const ops = opsByTag.get(tag);
      if (!ops) continue;
      if (ops.state === "stored" || ops.state === "received" || ops.state === "rma_pending") stored_or_received_not_racked++;
      else if (ops.state === "disposed") disposed_not_racked++;
      continue;
    }
    if (result.tier === "today") today.push(result);
    else if (result.tier === "this_week") this_week.push(result);
    else watch.push(result);
  }

  return {
    generated_at: now.toISOString(),
    counts: {
      today: today.length,
      this_week: this_week.length,
      watch: watch.length,
      expected: stored_or_received_not_racked + disposed_not_racked,
    },
    tiers: { today, this_week, watch },
    expected: { stored_or_received_not_racked, disposed_not_racked },
  };
}
