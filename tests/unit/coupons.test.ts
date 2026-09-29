import { afterEach, describe, expect, it } from "vitest";
import { couponFor } from "../../api/_lib/coupons";

const keys = ["COUPON_CODE_10", "COUPON_CODE_15", "COUPON_CODE_20"] as const;

afterEach(() => keys.forEach((key) => { delete process.env[key]; }));

describe("couponFor", () => {
  it("uses the documented fallback codes", () => {
    expect(couponFor(10)).toBe("ROYALE10");
    expect(couponFor(15)).toBe("ROYALE15");
    expect(couponFor(20)).toBe("ROYALE20");
  });

  it("reads the matching deployment environment variable", () => {
    process.env.COUPON_CODE_10 = "TEST10";
    process.env.COUPON_CODE_15 = "TEST15";
    process.env.COUPON_CODE_20 = "TEST20";
    expect(couponFor(10)).toBe("TEST10");
    expect(couponFor(15)).toBe("TEST15");
    expect(couponFor(20)).toBe("TEST20");
  });
});
