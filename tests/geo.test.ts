import { describe, expect, it } from "vitest";
import { haversineMiles, sortByDistance, formatDistance } from "@/lib/geo";
import type { Coords } from "@/types/review";

// Union Square ~ Times Square, NYC: ~1.6 mi apart.
const unionSq: Coords = { lat: 40.7359, lng: -73.9911 };
const timesSq: Coords = { lat: 40.758, lng: -73.9855 };

describe("haversineMiles", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineMiles(unionSq, unionSq)).toBeCloseTo(0, 5);
  });

  it("computes a known NYC distance within tolerance", () => {
    const d = haversineMiles(unionSq, timesSq);
    expect(d).toBeGreaterThan(1.4);
    expect(d).toBeLessThan(1.8);
  });

  it("is symmetric", () => {
    expect(haversineMiles(unionSq, timesSq)).toBeCloseTo(
      haversineMiles(timesSq, unionSq),
      6,
    );
  });
});

describe("sortByDistance", () => {
  it("annotates with distanceMi and sorts ascending", () => {
    const items = [
      { id: "far", lat: 40.8, lng: -73.95 },
      { id: "near", lat: 40.7361, lng: -73.9911 },
    ];
    const sorted = sortByDistance(items, unionSq);
    expect(sorted.map((i) => i.id)).toEqual(["near", "far"]);
    expect(sorted[0].distanceMi).toBeLessThan(sorted[1].distanceMi);
    expect(typeof sorted[0].distanceMi).toBe("number");
  });

  it("does not mutate the input array", () => {
    const items = [{ id: "a", lat: 40.8, lng: -73.95 }];
    const copy = [...items];
    sortByDistance(items, unionSq);
    expect(items).toEqual(copy);
  });
});

describe("formatDistance", () => {
  it("formats to one decimal with unit", () => {
    expect(formatDistance(0.32)).toBe("0.3 mi");
    expect(formatDistance(1.25)).toBe("1.3 mi");
  });
});
