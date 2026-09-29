import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSessionHandler } from "../../api/session";
import { request, response, testDatabase, testSession } from "./api-helpers";

process.env.SESSION_SECRET = "test-only-session-secret-at-least-32-bytes";
process.env.IP_HASH_SALT = "test-only-ip-hash-salt";

describe("GET /api/session with PGlite", () => {
  let setup: Awaited<ReturnType<typeof testDatabase>>;
  beforeAll(async () => { setup = await testDatabase(); });
  afterAll(async () => { await setup.database.close(); });
  beforeEach(async () => { await setup.query("TRUNCATE leads, spins, sessions CASCADE"); });

  it("creates the first idle session", async () => {
    const reply = response();
    await createSessionHandler({ query: setup.query })(request("GET"), reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ spinsLeft: 3, bonusAvailable: false, state: "idle", win: null });
    expect(reply.headers["Set-Cookie"]).toBeTruthy();
  });

  it("restores a winning session", async () => {
    const session = await testSession(setup.query);
    const spinId = randomUUID();
    await setup.query("INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref) VALUES ($1, $2, 1, $3, 'scott-3', 20, 'TR-ABC234')", [spinId, session.id, ["scott", "scott", "scott"]]);
    await setup.query("UPDATE sessions SET spins_used = 1, won_spin_id = $1 WHERE id = $2", [spinId, session.id]);
    const reply = response();
    await createSessionHandler({ query: setup.query })(request("GET", session.cookie), reply);
    expect(reply.body).toEqual({ spinsLeft: 0, bonusAvailable: false, state: "won", win: { spinId, winRef: "TR-ABC234", ruleId: "scott-3", discount: 20, couponCode: "ROYALE20", reels: ["scott", "scott", "scott"] } });
  });

  it("restores a claimed winning session", async () => {
    const session = await testSession(setup.query);
    const spinId = randomUUID();
    await setup.query("INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref) VALUES ($1, $2, 1, $3, 'neos-3', 10, 'TR-XYZ789')", [spinId, session.id, ["neos", "neos", "neos"]]);
    await setup.query("UPDATE sessions SET spins_used = 1, won_spin_id = $1 WHERE id = $2", [spinId, session.id]);
    await setup.query("INSERT INTO leads (id, spin_id, win_ref, discount, first_name, last_name, phone, email, postcode, consent_text, claimed_via) VALUES ($1, $2, 'TR-XYZ789', 10, 'Test', 'Player', '07123456789', 'test@example.com', 'SW1A 1AA', 'test consent', 'form')", [randomUUID(), spinId]);
    const reply = response();
    await createSessionHandler({ query: setup.query })(request("GET", session.cookie), reply);
    expect(reply.body).toMatchObject({ state: "claimed", win: { spinId, winRef: "TR-XYZ789" } });
  });

  it("restores game over after the bonus", async () => {
    const session = await testSession(setup.query);
    await setup.query("UPDATE sessions SET spins_used = 4 WHERE id = $1", [session.id]);
    const reply = response();
    await createSessionHandler({ query: setup.query })(request("GET", session.cookie), reply);
    expect(reply.body).toEqual({ spinsLeft: 0, bonusAvailable: false, state: "game_over", win: null });
  });
});
