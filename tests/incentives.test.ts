import { describe, expect, it } from "vitest";
import { getIncentiveRestaurants } from "@/lib/incentives";

describe("getIncentiveRestaurants", () => {
  const all = getIncentiveRestaurants();

  it("returns a non-empty list", () => {
    expect(all.length).toBeGreaterThanOrEqual(5);
  });

  it("every restaurant has unique id and valid coords", () => {
    const ids = new Set(all.map((r) => r.id));
    expect(ids.size).toBe(all.length);
    for (const r of all) {
      expect(r.lat).toBeGreaterThan(40);
      expect(r.lat).toBeLessThan(41);
      expect(r.lng).toBeLessThan(-73);
      expect(r.lng).toBeGreaterThan(-75);
    }
  });

  it("every restaurant has a perk and an honest-review condition", () => {
    for (const r of all) {
      expect(r.incentive.perk.length).toBeGreaterThan(0);
      expect(r.incentive.condition.toLowerCase()).toContain("honest");
    }
  });
});
