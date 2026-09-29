import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, hashIp, signSessionCookie, verifySessionCookie } from "../../api/_lib/session";

const SESSION_ID = "8f789bea-f39b-4c5f-817a-b999e1fcd04a";
const SECRET = "test-secret-with-at-least-32-characters";
const NOW = Date.UTC(2026, 8, 29);

describe("session cookie", () => {
  it("signs and verifies an unexpired session id", () => {
    const cookie = signSessionCookie(SESSION_ID, SECRET, NOW);
    expect(verifySessionCookie(cookie, SECRET, NOW + 1000)).toBe(SESSION_ID);
  });

  it("rejects tampered and expired cookies", () => {
    const cookie = signSessionCookie(SESSION_ID, SECRET, NOW);
    expect(verifySessionCookie(`${cookie.slice(0, -1)}x`, SECRET, NOW)).toBeNull();
    expect(verifySessionCookie(cookie, SECRET, NOW + SESSION_MAX_AGE_SECONDS * 1000)).toBeNull();
  });

  it("hashes IP with salt", () => {
    expect(hashIp("203.0.113.2", "one")).not.toBe(hashIp("203.0.113.2", "two"));
    expect(hashIp("203.0.113.2", "one")).toMatch(/^[0-9a-f]{64}$/);
  });
});
