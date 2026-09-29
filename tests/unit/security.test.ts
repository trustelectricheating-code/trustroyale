import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { forcedReels } from "../../api/_lib/rng";
import { hashIp, issueSessionCookie } from "../../api/_lib/session";
import { response } from "./api-helpers";

const originalEnvironment = { ...process.env };
afterEach(() => { process.env = { ...originalEnvironment }; });

describe("production security", () => {
  it("ignores forced reels in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.FORCE_REELS = "scott,scott,scott";
    expect(forcedReels()).toBeNull();
  });

  it("hashes IPs and issues a hardened session cookie", () => {
    expect(hashIp("203.0.113.9", "throwaway-test-salt")).not.toContain("203.0.113.9");
    process.env.SESSION_SECRET = "throwaway-test-secret-at-least-32-bytes";
    const reply = response();
    issueSessionCookie(reply, "00000000-0000-4000-8000-000000000001", 0);
    expect(reply.headers["Set-Cookie"]).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  });

  it("sets required Vercel headers and does not log API payloads", async () => {
    const [config, spinSource, sessionSource] = await Promise.all([
      readFile("vercel.json", "utf8"),
      readFile("api/spin.ts", "utf8"),
      readFile("api/session.ts", "utf8"),
    ]);
    const headers = JSON.stringify(JSON.parse(config).headers);
    expect(headers).toContain("Content-Security-Policy");
    expect(headers).toContain("X-Content-Type-Options");
    expect(headers).toContain("Referrer-Policy");
    expect(spinSource + sessionSource).not.toMatch(/console\.(?:log|info|warn|error)/);
  });
});
