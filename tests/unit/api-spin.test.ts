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
const win15: ReelSpin = {
  reels: ["keith", "keith", "keith"],
  strip: [["seven", "cherry", "sweets"], ["keith", "keith", "keith"], ["neos", "fiona", "gia"]],
};
const win10: ReelSpin = {
  reels: ["neos", "neos", "neos"],
  strip: [["seven", "cherry", "sweets"], ["neos", "neos", "neos"], ["scott", "fiona", "gia"]],
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
      expect(reply.body).toMatchObject({ spinsLeft: expected, bonusAvailable: expected === 0, isBonus: false, couponCode: null, gameOver: false, best: null });
      expect((reply.body as { strip: string[][]; reels: string[] }).strip[1]).toEqual((reply.body as { reels: string[] }).reels);
    }
    const bonus = response();
    await handler(request("POST", session.cookie), bonus);
    expect(bonus.body).toMatchObject({ spinNo: 4, spinsLeft: 0, bonusAvailable: false, isBonus: true, gameOver: true });
    const denied = response();
    await handler(request("POST", session.cookie), denied);
    expect(denied.statusCode).toBe(403);
    expect(denied.body).toEqual({ error: "no_spins_left", state: "game_over" });
  });

  it("asks the reels for a guaranteed prize only on the Last Chance spin", async () => {
    const session = await testSession(setup.query);
    const bonusFlags: boolean[] = [];
    const handler = createSpinHandler({ query: setup.query, spinReels: (options) => { bonusFlags.push(Boolean(options?.bonus)); return loss; }, newWinRef: () => "TR-ABC234" });
    for (let spin = 0; spin < 4; spin += 1) await handler(request("POST", session.cookie), response());
    expect(bonusFlags).toEqual([false, false, false, true]);
  });

  it("keeps the highest prize through three tries and hides coupon until the end", async () => {
    const session = await testSession(setup.query);
    const rolls = [win10, win15, win10];
    let index = 0;
    const refs = ["TR-TEN234", "TR-FIF234", "TR-LOW234"];
    let ref = 0;
    const handler = createSpinHandler({ query: setup.query, spinReels: () => rolls[index++], newWinRef: () => refs[ref++] });
    const first = response(); await handler(request("POST", session.cookie), first);
    expect(first.body).toMatchObject({ couponCode: null, gameOver: false, best: { discount: 10, winRef: "TR-TEN234" }, spinsLeft: 2 });
    const second = response(); await handler(request("POST", session.cookie), second);
    expect(second.body).toMatchObject({ couponCode: null, gameOver: false, best: { discount: 15, winRef: "TR-FIF234" }, spinsLeft: 1 });
    const third = response(); await handler(request("POST", session.cookie), third);
    expect(third.body).toMatchObject({ couponCode: "ROYALE15", gameOver: true, best: { discount: 15, winRef: "TR-FIF234" }, bonusAvailable: false });
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
