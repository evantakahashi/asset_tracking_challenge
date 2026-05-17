import { describe, expect, it } from "vitest";
import { parseLocation, serializeLocation, isDeployLocationComplete } from "./location";

describe("parseLocation", () => {
  it("parses full deploy locations", () => {
    expect(parseLocation("Lab-Building-A/Bay-12/Aisle-3/B-04/U05")).toEqual({
      site: "Lab-Building-A",
      room: "Bay-12",
      row: "Aisle-3",
      rack: "B-04",
      ru: "U05",
    });
  });

  it("parses storage-shape locations with three segments", () => {
    expect(parseLocation("Lab-Building-A/Storage-1/SHELF-3")).toEqual({
      site: "Lab-Building-A",
      room: "Storage-1",
      row: null,
      rack: "SHELF-3",
      ru: null,
    });
  });

  it("parses dock-shape locations as three segments (site/room/rack)", () => {
    expect(parseLocation("Lab-Building-A/Receiving/DOCK-2")).toEqual({
      site: "Lab-Building-A",
      room: "Receiving",
      row: null,
      rack: "DOCK-2",
      ru: null,
    });
  });

  it("returns null for unparseable strings", () => {
    expect(parseLocation("")).toBeNull();
    expect(parseLocation("just-one-segment")).toBeNull();
  });

  it("returns null for 2-, 4-, and 6-segment inputs (only 3 and 5 are valid)", () => {
    expect(parseLocation("A/B")).toBeNull();
    expect(parseLocation("A/B/C/D")).toBeNull();
    expect(parseLocation("A/B/C/D/E/F")).toBeNull();
  });

  it("trims segments and rejects empty interior segments", () => {
    expect(parseLocation("Lab-A//Rack-1")).toBeNull();
  });
});

describe("serializeLocation", () => {
  it("joins non-null segments with /", () => {
    expect(
      serializeLocation({
        site: "Lab-A", room: "Bay-12", row: "Aisle-3", rack: "B-04", ru: "U05",
      })
    ).toBe("Lab-A/Bay-12/Aisle-3/B-04/U05");
  });

  it("skips nulls", () => {
    expect(
      serializeLocation({
        site: "Lab-A", room: "Storage-1", row: null, rack: "SHELF-3", ru: null,
      })
    ).toBe("Lab-A/Storage-1/SHELF-3");
  });
});

describe("isDeployLocationComplete", () => {
  it("requires site + room + rack + ru", () => {
    expect(isDeployLocationComplete({ site: "A", room: "B", row: null, rack: "R", ru: "U1" })).toBe(true);
  });
  it("rejects missing ru", () => {
    expect(isDeployLocationComplete({ site: "A", room: "B", row: null, rack: "R", ru: null })).toBe(false);
  });
});
