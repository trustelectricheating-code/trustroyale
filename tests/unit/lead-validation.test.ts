import { describe, expect, it } from "vitest";
import { isValidSsTrackingId, normalisePhone, normalisePostcode, validateLead } from "../../src/game/leadValidation";

const good = { firstName: "Jane", lastName: "Smith", phone: "07911 123456", email: "jane@example.com", postcode: "ls1 4ap" };

describe("lead validation", () => {
  it.each(["07911 123456", "+447911123456", "+44 7911 123456", "+44 (0)7911 123456"])("accepts the UK phone format %s", (phone) => {
    expect(normalisePhone(phone)).toBe("07911123456");
    expect(validateLead({ ...good, phone }).ok).toBe(true);
  });

  it.each(["", "12345", "+1 202 555 0100", "07911 1234", "abc"])("rejects the phone %s", (phone) => {
    expect(validateLead({ ...good, phone })).toMatchObject({ ok: false, fields: { phone: expect.any(String) } });
  });

  it("stores postcodes upper-case with one space", () => {
    expect(normalisePostcode("ls14ap")).toBe("LS1 4AP");
    expect(normalisePostcode("  sw1a   1aa ")).toBe("SW1A 1AA");
    expect(normalisePostcode("m11ae")).toBe("M1 1AE");
    expect(normalisePostcode("12345")).toBeNull();
    expect(validateLead(good)).toMatchObject({ ok: true, value: { postcode: "LS1 4AP", phone: "07911123456" } });
  });

  it("reports every bad field and never trusts non-strings", () => {
    const result = validateLead({ firstName: "", lastName: "x".repeat(81), phone: 7, email: "nope", postcode: null });
    expect(result).toEqual({ ok: false, fields: expect.objectContaining({ firstName: expect.any(String), lastName: expect.any(String), phone: expect.any(String), email: expect.any(String), postcode: expect.any(String) }) });
  });

  it("accepts the trust-lp tracking id rule only", () => {
    for (const valid of ["123456|0123456789abcdef01234567", "a", "A_b.c-d|9"]) expect(isValidSsTrackingId(valid)).toBe(true);
    for (const invalid of ["", "_abc", "has space", "x".repeat(65), "a;b", 5, undefined]) expect(isValidSsTrackingId(invalid)).toBe(false);
  });
});
