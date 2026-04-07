import {
  BEHAVIOR_BADGE_DEFAULT,
  BEHAVIOR_HEX,
  BEHAVIOR_HEX_DEFAULT,
  getBehaviorBadge,
  getBehaviorHex,
  getSeriesColor,
} from "@/constants/behaviorColors";

describe("behaviorColors", () => {
  it("resolves known behavior hex values", () => {
    expect(getBehaviorHex("walking")).toBe(BEHAVIOR_HEX.walking);
    expect(getBehaviorHex("FEEDING_HEAD_DOWN")).toBe(BEHAVIOR_HEX.feeding_head_down);
  });

  it("resolves grouped and fallback behavior hex values", () => {
    expect(getBehaviorHex("feeding")).toBe(BEHAVIOR_HEX.feeding_head_down);
    expect(getBehaviorHex("resting")).toBe(BEHAVIOR_HEX.lying);
    expect(getBehaviorHex("unknown-behavior")).toBe(BEHAVIOR_HEX_DEFAULT);
  });

  it("resolves grouped and fallback badge classes", () => {
    expect(getBehaviorBadge("walking")).toContain("yellow");
    expect(getBehaviorBadge("feeding_head_up")).toContain("emerald");
    expect(getBehaviorBadge("lying")).toContain("indigo");
    expect(getBehaviorBadge("unknown")).toBe(BEHAVIOR_BADGE_DEFAULT);
  });

  it("resolves chart series colors", () => {
    expect(getSeriesColor("Feeding")).toBe(BEHAVIOR_HEX.feeding_head_down);
    expect(getSeriesColor("Resting")).toBe(BEHAVIOR_HEX.lying);
    expect(getSeriesColor("not-a-series")).toBe(BEHAVIOR_HEX_DEFAULT);
  });
});
