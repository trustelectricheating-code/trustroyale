import { describe, expect, it } from "vitest";
import { QUOTE_URL, quoteUrl } from "../../src/game/handoff";

describe("quote hand-off URL", () => {
  it("sends a winner to the quote form with their win reference and discount", () => {
    expect(quoteUrl("", { winRef: "TR-7K3F", discount: 20 })).toBe(`${QUOTE_URL}?prize=TR-7K3F&discount=20#quote`);
  });

  it("sends a non-winner to the quote form with no prize", () => {
    expect(quoteUrl("")).toBe(`${QUOTE_URL}#quote`);
  });

  it("carries attribution back and drops every other parameter", () => {
    const url = new URL(quoteUrl("?utm_source=google&gclid=abc&title=sign&foo=bar", { winRef: "TR-7K3F", discount: 15 }));
    expect([...url.searchParams.keys()]).toEqual(["utm_source", "gclid", "prize", "discount"]);
    expect(url.searchParams.get("gclid")).toBe("abc");
    expect(url.hash).toBe("#quote");
  });

  it("trims attribution values, caps them at 500 characters and skips empty ones", () => {
    const url = new URL(quoteUrl(`?utm_campaign=${"x".repeat(600)}&utm_term=%20%20&fbclid=%20id%20`));
    expect(url.searchParams.get("utm_campaign")).toHaveLength(500);
    expect(url.searchParams.has("utm_term")).toBe(false);
    expect(url.searchParams.get("fbclid")).toBe("id");
  });
});
