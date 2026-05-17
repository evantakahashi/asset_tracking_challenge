import type { Asset, FacilitiesRecord, FinanceRecord } from "../types";
import type { DriftCard, ViewSnapshot } from "./types";

export const STALE_DAYS = 60;
export const DISPOSAL_LAG_DAYS = 30;

function daysBetween(a: Date, b: Date): number {
  const diff = Math.abs(a.getTime() - b.getTime());
  return Number.isFinite(diff) ? diff / 86400_000 : Infinity;
}

function opsView(o: Asset): ViewSnapshot {
  if (o.state === "in_service") {
    const loc = [o.location.rack, o.location.ru].filter(Boolean).join("/");
    return { display: loc || o.state, raw: { state: o.state, location: o.location } };
  }
  return { display: o.state, raw: { state: o.state } };
}

function facView(f: FacilitiesRecord): ViewSnapshot {
  return {
    display: f.rack_location,
    raw: { rack_location: f.rack_location, last_observed: f.last_observed },
  };
}

function finView(f: FinanceRecord): ViewSnapshot {
  return { display: f.status, raw: { status: f.status, capitalized_on: f.capitalized_on } };
}

function rackKey(racklocStr: string | undefined | null): string | null {
  if (!racklocStr) return null;
  const parts = racklocStr.split("/");
  if (parts.length < 5) return null;
  return `${parts[3]}/${parts[4]}`;
}

function opsRackKey(o: Asset): string | null {
  if (!o.location.rack || !o.location.ru) return null;
  return `${o.location.rack}/${o.location.ru}`;
}

export function classifyDrift(
  ops: Asset | null,
  facilities: FacilitiesRecord | null,
  finance: FinanceRecord | null,
  now: Date,
): DriftCard | { kind: "expected" } | null {
  const tag = ops?.asset_tag ?? facilities?.tagged_id ?? finance?.tag;
  if (!tag) return null;

  // === Tier 1 — most operationally urgent, checked first ===

  if (!ops && facilities) {
    return {
      category: "orphan_on_rack",
      tier: "today",
      asset_tag: tag,
      views: {
        ops: null,
        facilities: facView(facilities),
        finance: finance ? finView(finance) : null,
      },
      action: "Physical audit at this rack — barcode the instrument or remove the facilities row.",
    };
  }

  if (ops && facilities && (ops.state === "disposed" || ops.state === "rma_pending")) {
    return {
      category: "ghost_on_rack",
      tier: "today",
      asset_tag: tag,
      views: {
        ops: opsView(ops),
        facilities: facView(facilities),
        finance: finance ? finView(finance) : null,
      },
      action: "Delete the facilities row — this asset isn't physically racked.",
    };
  }

  if (ops && facilities && ops.state === "in_service") {
    const a = opsRackKey(ops);
    const b = rackKey(facilities.rack_location);
    if (a && b && a !== b) {
      return {
        category: "mislocated",
        tier: "today",
        asset_tag: tag,
        views: {
          ops: opsView(ops),
          facilities: facView(facilities),
          finance: finance ? finView(finance) : null,
        },
        action: "Walk the rack and re-scan; whichever system disagrees with the physical reality gets corrected.",
      };
    }
  }

  // === Tier 2 ===

  if (!ops && finance) {
    return {
      category: "ghost_on_books",
      tier: "this_week",
      asset_tag: tag,
      views: { ops: null, facilities: facilities ? facView(facilities) : null, finance: finView(finance) },
      action: "Check with procurement whether this asset was actually received; if not, write off the PO line.",
    };
  }

  if (ops && !finance) {
    return {
      category: "off_books",
      tier: "this_week",
      asset_tag: tag,
      views: { ops: opsView(ops), facilities: facilities ? facView(facilities) : null, finance: null },
      action: "Ping procurement to close the PO.",
    };
  }

  if (ops && ops.state === "disposed" && finance && finance.status === "capitalized") {
    const disposalAt = new Date(ops.updated_at);
    const days = daysBetween(now, disposalAt);
    if (days > DISPOSAL_LAG_DAYS) {
      return {
        category: "disposed_but_capitalized",
        tier: "this_week",
        asset_tag: tag,
        views: { ops: opsView(ops), facilities: null, finance: finView(finance) },
        action: `Notify finance to retire this asset — disposal happened ${Math.floor(days)} days ago.`,
        context: `Disposed ${Math.floor(days)} days ago`,
      };
    }
  }

  // === Tier 3 ===

  if (ops && ops.state === "in_service" && facilities) {
    const lastObs = new Date(facilities.last_observed);
    const days = daysBetween(now, lastObs);
    if (days > STALE_DAYS) {
      return {
        category: "stale_rack_obs",
        tier: "watch",
        asset_tag: tag,
        views: { ops: opsView(ops), facilities: facView(facilities), finance: finance ? finView(finance) : null },
        action: "Schedule a rack re-scan — facilities hasn't observed this asset in a while.",
        context: `Last seen ${Math.floor(days)} days ago`,
      };
    }
  }

  // === Expected — scope difference, not drift ===

  if (ops && !facilities) {
    if (ops.state === "stored" || ops.state === "received" || ops.state === "rma_pending") {
      return { kind: "expected" };
    }
    if (ops.state === "disposed") {
      const disposalAt = new Date(ops.updated_at);
      const days = daysBetween(now, disposalAt);
      if (days <= DISPOSAL_LAG_DAYS) return { kind: "expected" };
    }
  }

  return null;
}
