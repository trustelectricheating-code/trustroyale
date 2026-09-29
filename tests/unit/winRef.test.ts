import { describe, expect, it } from "vitest";
import { newWinRef, WIN_REF_ALPHABET } from "../../api/_lib/winRef";

describe("win references", () => {
  it("uses six unambiguous characters", () => {
    expect(WIN_REF_ALPHABET).not.toMatch(/[0O1I]/);
    for (let index = 0; index < 10_000; index += 1) {
      expect(newWinRef()).toMatch(/^TR-[^0O1I]{6}$/);
    }
  });
});
