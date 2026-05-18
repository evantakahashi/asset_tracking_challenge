import type { DriftCard, DriftCategory } from "./types";

const STATIC_LABELS: Record<DriftCategory, string> = {
  mislocated: "Mislocated",
  ghost_on_rack: "Facilities still has it racked",
  orphan_on_rack: "Untagged asset in a rack",
  off_books: "Off the books",
  ghost_on_books: "Ghost on the books",
  disposed_but_capitalized: "Still on the books after disposal",
  stale_rack_obs: "Last seen long ago",
};

// Some categories carry a dynamic component in their context — fold it in.
export function labelFor(card: Pick<DriftCard, "category" | "context">): string {
  if (card.category === "stale_rack_obs" && card.context) {
    return card.context;
  }
  return STATIC_LABELS[card.category];
}

export function staticLabelFor(category: DriftCategory): string {
  return STATIC_LABELS[category];
}
