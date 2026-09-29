import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSpinHandler } from "../../api/spin";
import type { ReelSpin } from "../../api/_lib/rng";
import { request, response, testDatabase, testSession } from "./api-helpers";

process.env.SESSION_SECRET = "test-only-session-secret-at-least-32-bytes";
process.env.IP_HASH_SALT = "test-only-ip-hash-salt";
process.env.DAILY_SESSIONS_PER_IP = "0";

const loss: ReelSpin = {
  reels: ["seven", "cherry", "sweets"],
  strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]],
};
const win: ReelSpin = {
  reels: ["scott", "scott", "scott"],
  strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
};

describe("POST /api/spin with PGlite", () => {
  let setup: Awaited<ReturnType<typeof testDatabase>>;

  beforeAll(async () => { setup = await testDatabase(); });
  afterAll(async () => { await setup.database.close(); });
  beforeEach(async () => { await setup.query("TRUNCATE leads, spins, sessions CASCADE"); });

  it("offers three regular spins, one bonus, then game over", async () => {
    const session = await testSession(setup.query);
    const handler = createSpinHandler({ query: setup.query, spinReels: () => loss, newWinRef: () => "TR-ABC234" });
    for (let expected = 2; expected >= 0; expected -= 1) {
      const reply = response();
      await handler(request("POST", session.cookie), reply);
      expect(reply.statusCode).toBe(200);
      expect(reply.body).toMatchObject({ spinsLeft: expected, bonusAvailable: expected === 0, isBonus: false });
      expect((reply.body as { strip: string[][]; reels: string[] }).strip[1]).toEqual((reply.body as { reels: string[] }).reels);
    }
    const bonus = response();
    await handler(request("POST", session.cookie), bonus);
    expect(bonus.body).toMatchObject({ spinNo: 4, spinsLeft: 0, bonusAvailable: false, isBonus: true });
    const denied = response();
    await handler(request("POST", session.cookie), denied);
    expect(denied.statusCode).toBe(403);
    expect(denied.body).toEqual({ error: "no_spins_left", state: "game_over" });
  });

  it("ends play immediately after a win", async () => {
    const session = await testSession(setup.query);
    const handler = createSpinHandler({ query: setup.query, spinReels: () => win, newWinRef: () => "TR-ABC234" });
    const reply = response();
    await handler(request("POST", session.cookie), reply);
    expect(reply.body).toMatchObject({ outcome: "win", ruleId: "scott-3", discount: 20, spinsLeft: 0 });
    const denied = response();
    await handler(request("POST", session.cookie), denied);
    expect(denied.body).toEqual({ error: "no_spins_left", state: "won" });
  });

  it("never records more than four concurrent spins", async () => {
    const session = await testSession(setup.query);
    const handler = createSpinHandler({ query: setup.query, spinReels: () => loss, newWinRef: () => "TR-ABC234" });
    await Promise.all(Array.from({ length: 20 }, async () => {
      const reply = response();
      await handler(request("POST", session.cookie), reply);
      expect([200, 403]).toContain(reply.statusCode);
    }));
    const rows = await setup.query<{ count: string }>("SELECT count(*)::text AS count FROM spins WHERE session_id = $1", [session.id]);
    expect(rows[0].count).toBe("4");
  });

  it("keeps the payline identical to strip row one", async () => {
    const session = await testSession(setup.query);
    const handler = createSpinHandler({ query: setup.query, spinReels: () => ({ ...loss, strip: [loss.strip[0], loss.reels, loss.strip[2]] }), newWinRef: () => `TR-${randomUUID().slice(0, 6).toUpperCase()}` });
    const reply = response();
    await handler(request("POST", session.cookie), reply);
    const body = reply.body as { strip: string[][]; reels: string[] };
    expect(body.strip[1]).toEqual(body.reels);
  });
});
