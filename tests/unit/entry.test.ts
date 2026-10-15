import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseEntryFragment, readEntry, takeEntryFromLocation } from "../../src/game/entry";

const VECTOR = "eyJmaXJzdE5hbWUiOiJTacOibiIsImxhc3ROYW1lIjoiTydOZWlsbCIsInBob25lIjoiMDc5MTEgMTIzNDU2IiwiZW1haWwiOiJzaWFuQGV4YW1wbGUuY29tIiwicmVnaW9uIjoiWW9ya3NoaXJlIGFuZCB0aGUgSHVtYmVyIn0";
const expected = { fullName: "Siân O'Neill", phone: "07911 123456", email: "sian@example.com", region: "Yorkshire and the Humber" };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

describe("entry fragment", () => {
  it("decodes the shared test vector exactly", () => {
    expect(parseEntryFragment(`#entry=${VECTOR}`)).toEqual(expected);
  });

  it("returns null for malformed base64, bad JSON and non-entry hashes", () => {
    expect(parseEntryFragment("#entry=!!!not-base64")).toBeNull();
    expect(parseEntryFragment(`#entry=${encode("x").slice(0, 3)}`)).toBeNull();
    expect(parseEntryFragment(`#entry=${Buffer.from("not json").toString("base64url")}`)).toBeNull();
    expect(parseEntryFragment("#terms")).toBeNull();
    expect(parseEntryFragment("")).toBeNull();
  });

  it("drops an invalid email but keeps the other fields", () => {
    const { email: _email, ...rest } = expected;
    expect(parseEntryFragment(`#entry=${encode({ ...expected, email: "nope" })}`)).toEqual(rest);
  });

  it("ignores a postcode key and drops a region that is not on the list", () => {
    expect(parseEntryFragment(`#entry=${encode({ ...expected, postcode: "LS1 4AP" })}`)).toEqual(expected);
    expect(parseEntryFragment(`#entry=${encode({ ...expected, region: "Atlantis" })}`)).not.toHaveProperty("region");
  });

  it("prefills Full name from firstName alone, or from firstName and lastName", () => {
    expect(parseEntryFragment(`#entry=${encode({ firstName: "Margaret" })}`)).toEqual({ fullName: "Margaret" });
    expect(parseEntryFragment(`#entry=${encode({ firstName: "Siân", lastName: "O'Neill" })}`)).toEqual({ fullName: "Siân O'Neill" });
  });

  it("prefers fullName over firstName/lastName and prefills all four fields", () => {
    const entry = { fullName: "Margaret Jones", firstName: "Other", phone: "07911 123456", email: "m@example.com", region: "London" };
    expect(parseEntryFragment(`#entry=${encode(entry)}`)).toEqual({ fullName: "Margaret Jones", phone: "07911 123456", email: "m@example.com", region: "London" });
  });

  it("keeps an empty name out and returns null when nothing valid remains", () => {
    expect(parseEntryFragment(`#entry=${encode({ ...expected, fullName: "", firstName: "", lastName: "" })}`)).not.toHaveProperty("fullName");
    expect(parseEntryFragment(`#entry=${encode({ firstName: "", lastName: "", phone: "1", email: "x", region: "Atlantis" })}`)).toBeNull();
  });
});

describe("takeEntryFromLocation", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
  });

  it("stores the details and strips the fragment", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("location", { hash: `#entry=${VECTOR}`, pathname: "/", search: "?a=1" });
    vi.stubGlobal("history", { replaceState });
    takeEntryFromLocation();
    expect(readEntry()).toEqual(expected);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/?a=1");
  });

  it("does nothing for a hash without an entry", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("location", { hash: "#other", pathname: "/", search: "" });
    vi.stubGlobal("history", { replaceState });
    takeEntryFromLocation();
    expect(readEntry()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
