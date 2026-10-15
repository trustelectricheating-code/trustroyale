import { describe, expect, it } from "vitest";
import { DISCOUNT_FIELD, buildPostback, sendPostback } from "../../api/_lib/sharpspring";

const lead = { firstName: "Jane", lastName: "Smith", phone: "07911123456", email: "jane@example.com", region: "Yorkshire and the Humber", winRef: "TR-7K3F", discount: 15 };
const base = ["1", "3", "4", "76", "204", "234", "296", "win_ref", "discount", DISCOUNT_FIELD];

describe("SharpSpring postback builder", () => {
  it("posts exactly the agreed keys and values", () => {
    const body = buildPostback(lead, { marketingUrl: "https://game.example/?gclid=abc123&utm_source=google" });
    expect([...body.keys()].sort()).toEqual([...base].sort());
    expect(Object.fromEntries(body)).toEqual({
      "1": "Jane Smith", "3": "07911123456", "4": "jane@example.com", "76": "2026 Trust Royale Game Claim",
      "204": "https://game.example/?gclid=abc123&utm_source=google", "234": "abc123",
      "296": "Yorkshire and the Humber", win_ref: "TR-7K3F", discount: "15", black_friday_2026_400000066793474: "15",
    });
  });

  it("posts the discount into the Black Friday custom field on a claim only", () => {
    expect(DISCOUNT_FIELD).toBe("black_friday_2026_400000066793474");
    expect(buildPostback(lead).get(DISCOUNT_FIELD)).toBe("15");
    const entry = buildPostback({ firstName: "Jane", lastName: "Smith", email: "jane@example.com" });
    expect(entry.has(DISCOUNT_FIELD)).toBe(false);
    expect(entry.has("discount")).toBe(false);
    expect(entry.has("win_ref")).toBe(false);
    expect(entry.get("76")).toBe("2026 Trust Royale Game Entry");
  });

  it("omits phone (3) and region (296) when empty so the CRM values are never blanked", () => {
    for (const empty of [{ phone: "", region: "" }, { phone: null, region: null }]) {
      const body = buildPostback({ ...lead, ...empty });
      expect(body.has("3")).toBe(false);
      expect(body.has("296")).toBe(false);
      expect(body.get("4")).toBe("jane@example.com");
    }
  });

  it("sends a one-word name with no trailing space", () => {
    expect(buildPostback({ ...lead, firstName: "Cher", lastName: "" }).get("1")).toBe("Cher");
  });

  it("adds trackingid__sb only for a valid id and drops an invalid one", () => {
    const valid = buildPostback(lead, { marketingUrl: "https://game.example/", ssTrackingId: "123456|0123456789abcdef01234567" });
    expect([...valid.keys()].sort()).toEqual([...base, "trackingid__sb"].sort());
    expect(valid.get("trackingid__sb")).toBe("123456|0123456789abcdef01234567");
    for (const bad of ["bad value;", "", "_x", undefined, 12]) {
      expect(buildPostback(lead, { marketingUrl: "https://game.example/", ssTrackingId: bad }).has("trackingid__sb")).toBe(false);
    }
  });

  it("caps the marketing URL at 255 characters and leaves gclid empty when absent", () => {
    const body = buildPostback(lead, { marketingUrl: `https://game.example/?${"a".repeat(400)}` });
    expect(body.get("204")).toHaveLength(255);
    expect(body.get("234")).toBe("");
  });
});

describe("sendPostback", () => {
  it("treats 2xx as success and anything else as failure, through a stubbed fetch only", async () => {
    const original = globalThis.fetch;
    const calls: Array<{ url: string; init: RequestInit }> = [];
    let status = 200;
    globalThis.fetch = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response("", { status }); }) as typeof fetch;
    try {
      await expect(sendPostback("https://postback.invalid/x", new URLSearchParams({ a: "b" }))).resolves.toBeUndefined();
      expect(calls[0].init.body).toBe("a=b");
      status = 500;
      await expect(sendPostback("https://postback.invalid/x", new URLSearchParams())).rejects.toThrow("500");
    } finally { globalThis.fetch = original; }
  });
});
