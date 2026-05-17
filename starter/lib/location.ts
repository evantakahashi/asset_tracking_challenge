import type { Location } from "./types";

export function parseLocation(input: string): Location | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/").map((s) => s.trim());
  if (parts.some((p) => p === "")) return null;

  switch (parts.length) {
    case 3:
      // Storage or dock: site / room / rack
      return { site: parts[0]!, room: parts[1]!, row: null, rack: parts[2]!, ru: null };
    case 5:
      // Deploy: site / room / row / rack / ru
      return {
        site: parts[0]!, room: parts[1]!, row: parts[2]!, rack: parts[3]!, ru: parts[4]!,
      };
    default:
      return null;
  }
}

export function serializeLocation(loc: Location): string {
  return [loc.site, loc.room, loc.row, loc.rack, loc.ru]
    .filter((s): s is string => !!s)
    .join("/");
}

export function isDeployLocationComplete(loc: Location): boolean {
  return !!(loc.site && loc.room && loc.rack && loc.ru);
}
