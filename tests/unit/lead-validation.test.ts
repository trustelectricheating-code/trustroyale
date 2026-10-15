import { describe, expect, it } from "vitest";
import { isValidSsTrackingId, normalisePhone, REGIONS, splitFullName, validateLead } from "../../src/game/leadValidation";

const good = { fullName: "Jane Smith", phone: "07911 123456", email: "jane@example.com", region: "Yorkshire and the Humber" };

describe("lead validation", () => {
  it.each(["07911 123456", "+447911123456", "+44 7911 123456", "+44 (0)7911 123456"])("accepts the UK phone format %s", (phone) => {
    expect(normalisePhone(phone)).toBe("07911123456");
    expect(validateLead({ ...good, phone }).ok).toBe(true);
  });

  it.each(["", "12345", "+1 202 555 0100", "07911 1234", "abc"])("rejects the phone %s", (phone) => {
    expect(validateLead({ ...good, phone })).toMatchObject({ ok: false, fields: { phone: expect.any(String) } });
  });

  it("accepts exactly the 11 regions and nothing else", () => {
    expect(REGIONS).toEqual(["North East", "North West", "Yorkshire and the Humber", "East Midlands", "West Midlands", "East of England", "London", "South East", "South West", "Wales", "Scotland"]);
    for (const region of REGIONS) expect(validateLead({ ...good, region })).toMatchObject({ ok: true, value: { region, phone: "07911123456" } });
    for (const region of ["", "Atlantis", "london", "LS1 4AP", null, 5]) expect(validateLead({ ...good, region })).toMatchObject({ ok: false, fields: { region: expect.any(String) } });
  });

  it("no longer asks for or returns a postcode", () => {
    const legacy: Record<string, unknown> = { ...good, postcode: "LS1 4AP" };
    expect(validateLead(legacy)).toEqual({ ok: true, value: { fullName: "Jane Smith", phone: "07911123456", email: "jane@example.com", region: "Yorkshire and the Humber" } });
  });

  it("accepts a one-word full name and collapses internal whitespace", () => {
    expect(validateLead({ ...good, fullName: "  Cher " })).toMatchObject({ ok: true, value: { fullName: "Cher" } });
    expect(validateLead({ ...good, fullName: " Mary \t  Ann\n Smith " })).toMatchObject({ ok: true, value: { fullName: "Mary Ann Smith" } });
    expect(validateLead({ ...good, fullName: "   " })).toMatchObject({ ok: false, fields: { fullName: expect.any(String) } });
  });

  it("splits a full name into first word and the rest", () => {
    expect(splitFullName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
    expect(splitFullName("Mary Ann Smith")).toEqual({ firstName: "Mary", lastName: "Ann Smith" });
  });

  it("reports every bad field and never trusts non-strings", () => {
    const result = validateLead({ fullName: "x".repeat(81), phone: 7, email: "nope", region: null });
    expect(result).toEqual({ ok: false, fields: expect.objectContaining({ fullName: "Please enter your full name.", phone: expect.any(String), email: expect.any(String), region: expect.any(String) }) });
  });

  it("accepts the trust-lp tracking id rule only", () => {
    for (const valid of ["123456|0123456789abcdef01234567", "a", "A_b.c-d|9"]) expect(isValidSsTrackingId(valid)).toBe(true);
    for (const invalid of ["", "_abc", "has space", "x".repeat(65), "a;b", 5, undefined]) expect(isValidSsTrackingId(invalid)).toBe(false);
  });
});
