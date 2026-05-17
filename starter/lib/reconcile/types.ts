import type { Asset, FacilitiesRecord, FinanceRecord } from "../types";

export type DriftCategory =
  | "mislocated"
  | "ghost_on_rack"
  | "orphan_on_rack"
  | "off_books"
  | "ghost_on_books"
  | "disposed_but_capitalized"
  | "stale_rack_obs";

export type DriftTier = "today" | "this_week" | "watch";

export type ViewSnapshot = {
  display: string;
  raw?: Partial<Asset> | Partial<FacilitiesRecord> | Partial<FinanceRecord>;
};

export type DriftCard = {
  category: DriftCategory;
  tier: DriftTier;
  asset_tag: string;
  views: {
    ops: ViewSnapshot | null;
    facilities: ViewSnapshot | null;
    finance: ViewSnapshot | null;
  };
  action: string;
  context?: string;
};

export type ReconcileReport = {
  generated_at: string;
  counts: {
    today: number;
    this_week: number;
    watch: number;
    expected: number;
  };
  tiers: {
    today: DriftCard[];
    this_week: DriftCard[];
    watch: DriftCard[];
  };
  expected: {
    stored_or_received_not_racked: number;
    disposed_not_racked: number;
  };
};
