import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLeadHandler } from "../../api/lead";
import { createCrmSyncHandler } from "../../api/cron/crm-sync";
import { backoffMinutes, retryDueLeads } from "../../api/_lib/crmRetry";
import { createSessionHandler } from "../../api/session";
import { CONSENT_TEXT } from "../../src/game/leadValidation";
import { request, response, testDatabase, testSession } from "./api-helpers";

process.env.SESSION_SECRET = "test-only-session-secret-at-least-32-bytes";
process.env.IP_HASH_SALT = "test-only-ip-hash-salt";
delete process.env.SHARPSPRING_POSTBACK_URL;

const FAKE_URL = "https://postback.invalid/receive";
const details = { firstName: "Jane", lastName: "Smith", phone: "+44 (0)7911 123456", email: "jane@example.com", region: "Yorkshire and the Humber", website: "", marketingUrl: "https://game.example/?gclid=g1", ssTrackingId: "123456|0123456789abcdef01234567" };

function post(cookie: string | undefined, body: unknown) {
  return Object.assign(request("POST", cookie), { body });
}

describe("POST /api/lead with PGlite", () => {
  let setup: Awaited<ReturnType<typeof testDatabase>>;
  beforeAll(async () => { setup = await testDatabase(); });
  afterAll(async () => { await setup.database.close(); });
  beforeEach(async () => { await setup.query("TRUNCATE leads, spins, sessions CASCADE"); });

  async function winningSession(discount = 15, winRef = "TR-WIN234") {
    const session = await testSession(setup.query);
    const spinId = randomUUID();
    await setup.query("INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref) VALUES ($1, $2, 1, $3, 'keith-3', $4, $5)", [spinId, session.id, ["keith", "keith", "keith"], discount, winRef]);
    await setup.query("UPDATE sessions SET spins_used = 3, won_spin_id = $1 WHERE id = $2", [spinId, session.id]);
    return { ...session, spinId };
  }

  function handler(extra: Parameters<typeof createLeadHandler>[0] = {}) {
    const pending: Promise<unknown>[] = [];
    const send = vi.fn(async (_url: string, _body: URLSearchParams) => undefined);
    return { pending, send, run: createLeadHandler({ query: setup.query, waitUntil: (work) => { pending.push(work); }, send, url: FAKE_URL, ...extra }) };
  }

  it("stores the lead, answers 201 and flips the session to claimed", async () => {
    const session = await winningSession();
    const { run, pending, send } = handler();
    const reply = response();
    await run(post(session.cookie, { ...details, spinId: session.spinId }), reply);
    expect(reply.statusCode).toBe(201);
    expect(reply.body).toEqual({ ok: true, winRef: "TR-WIN234" });
    const rows = await setup.query<Record<string, unknown>>("SELECT * FROM leads");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ first_name: "Jane", last_name: "Smith", phone: "07911123456", email: "jane@example.com", region: "Yorkshire and the Humber", postcode: null, marketing_consent: false, consent_text: CONSENT_TEXT, claimed_via: "form" });
    await Promise.all(pending);
    expect(send).toHaveBeenCalledTimes(1);
    const sent = send.mock.calls[0][1];
    expect(sent.get("234")).toBe("g1");
    expect(sent.get("296")).toBe("Yorkshire and the Humber");
    expect(sent.has("postcode")).toBe(false);
    expect(sent.get("trackingid__sb")).toBe("123456|0123456789abcdef01234567");
    expect((await setup.query<{ crm_status: string; crm_attempts: number }>("SELECT crm_status, crm_attempts FROM leads"))[0]).toEqual({ crm_status: "synced", crm_attempts: 1 });
    const state = response();
    await createSessionHandler({ query: setup.query })(request("GET", session.cookie), state);
    expect(state.body).toMatchObject({ state: "claimed" });
  });

  it("answers 200 duplicate and sends only once", async () => {
    const session = await winningSession();
    const { run, pending, send } = handler();
    await run(post(session.cookie, { ...details, spinId: session.spinId }), response());
    const again = response();
    await run(post(session.cookie, { ...details, firstName: "Other", spinId: session.spinId }), again);
    await Promise.all(pending);
    expect(again.statusCode).toBe(200);
    expect(again.body).toEqual({ ok: true, winRef: "TR-WIN234", duplicate: true });
    expect(await setup.query("SELECT 1 FROM leads")).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("returns 400 with the failing fields and stores nothing", async () => {
    const session = await winningSession();
    const reply = response();
    await handler().run(post(session.cookie, { ...details, spinId: session.spinId, phone: "123", email: "bad", firstName: "" }), reply);
    expect(reply.statusCode).toBe(400);
    expect(reply.body).toMatchObject({ error: "invalid", fields: { phone: expect.any(String), email: expect.any(String), firstName: expect.any(String) } });
    expect(await setup.query("SELECT 1 FROM leads")).toHaveLength(0);
  });

  it("returns 403 for a loss, another player's spin, an unknown spin and no cookie", async () => {
    const mine = await winningSession();
    const theirs = await winningSession(10, "TR-OTHER2");
    const lossSession = await testSession(setup.query);
    const lossSpin = randomUUID();
    await setup.query("INSERT INTO spins (id, session_id, spin_no, reels) VALUES ($1, $2, 1, $3)", [lossSpin, lossSession.id, ["seven", "cherry", "sweets"]]);
    const { run } = handler();
    const cases: Array<[string | undefined, string]> = [[mine.cookie, theirs.spinId], [lossSession.cookie, lossSpin], [mine.cookie, randomUUID()], [undefined, mine.spinId]];
    for (const [cookie, spinId] of cases) {
      const reply = response();
      await run(post(cookie, { ...details, spinId }), reply);
      expect(reply.statusCode).toBe(403);
      expect(reply.body).toEqual({ error: "not_a_win" });
    }
    expect(await setup.query("SELECT 1 FROM leads")).toHaveLength(0);
  });

  it("accepts a filled honeypot with 201 and discards it", async () => {
    const session = await winningSession();
    const { run, send, pending } = handler();
    const reply = response();
    await run(post(session.cookie, { ...details, spinId: session.spinId, website: "http://spam.example" }), reply);
    expect(reply.statusCode).toBe(201);
    await Promise.all(pending);
    expect(await setup.query("SELECT 1 FROM leads")).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("takes discount and win_ref from the spin row, never the request", async () => {
    const session = await winningSession(20, "TR-REAL20");
    const reply = response();
    await handler().run(post(session.cookie, { ...details, spinId: session.spinId, discount: 10, winRef: "TR-FAKE10", win_ref: "TR-FAKE10" }), reply);
    expect(reply.body).toEqual({ ok: true, winRef: "TR-REAL20" });
    expect((await setup.query<{ discount: number; win_ref: string }>("SELECT discount, win_ref FROM leads"))[0]).toEqual({ discount: 20, win_ref: "TR-REAL20" });
  });

  it("keeps the lead pending, with no send, while no postback URL is set", async () => {
    const session = await winningSession();
    const { run, pending, send } = handler({ url: undefined });
    await run(post(session.cookie, { ...details, spinId: session.spinId }), response());
    await Promise.all(pending);
    expect(send).not.toHaveBeenCalled();
    expect((await setup.query<{ crm_status: string; crm_attempts: number }>("SELECT crm_status, crm_attempts FROM leads"))[0]).toEqual({ crm_status: "pending", crm_attempts: 0 });
  });
});

describe("CRM retry with PGlite", () => {
  let setup: Awaited<ReturnType<typeof testDatabase>>;
  beforeAll(async () => { setup = await testDatabase(); });
  afterAll(async () => { await setup.database.close(); });
  beforeEach(async () => { await setup.query("TRUNCATE leads, spins, sessions CASCADE"); });

  async function lead(overrides: { status?: string; attempts?: number; nextTry?: string } = {}) {
    const session = await testSession(setup.query);
    const spinId = randomUUID();
    const ref = `TR-${randomUUID().slice(0, 6).toUpperCase()}`;
    await setup.query("INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref) VALUES ($1, $2, 1, $3, 'keith-3', 15, $4)", [spinId, session.id, ["keith", "keith", "keith"], ref]);
    const id = randomUUID();
    await setup.query(`INSERT INTO leads (id, spin_id, win_ref, discount, first_name, last_name, phone, email, region, consent_text, claimed_via, crm_status, crm_attempts, crm_next_try_at)
      VALUES ($1, $2, $3, 15, 'Jane', 'Smith', '07911123456', 'j@example.com', 'Wales', 'c', 'form', $4, $5, ${overrides.nextTry ?? "now() - interval '1 minute'"})`,
      [id, spinId, ref, overrides.status ?? "pending", overrides.attempts ?? 0]);
    return id;
  }
  const row = async (id: string) => (await setup.query<{ crm_status: string; crm_attempts: number; mins: number; err: string | null }>(
    "SELECT crm_status, crm_attempts, round(extract(epoch FROM (crm_next_try_at - now())) / 60)::int AS mins, crm_last_error AS err FROM leads WHERE id = $1", [id]))[0];

  it("sends only due, pending leads and respects the limit", async () => {
    const due = await lead();
    const future = await lead({ nextTry: "now() + interval '1 hour'" });
    const synced = await lead({ status: "synced" });
    const failed = await lead({ status: "failed" });
    const send = vi.fn(async () => undefined);
    const result = await retryDueLeads(50, { query: setup.query, send, url: FAKE_URL });
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sent: 1, failed: 0, remaining: 1 });
    expect((await row(due)).crm_status).toBe("synced");
    expect((await row(future)).crm_attempts).toBe(0);
    expect((await row(synced)).crm_attempts).toBe(0);
    expect((await row(failed)).crm_status).toBe("failed");

    await lead(); await lead(); await lead();
    const limited = vi.fn(async () => undefined);
    await retryDueLeads(2, { query: setup.query, send: limited, url: FAKE_URL });
    expect(limited).toHaveBeenCalledTimes(2);
  });

  it("backs off 5 minutes, 15 minutes, 1 hour, then 6 hours", async () => {
    expect([1, 2, 3, 4, 5, 9].map(backoffMinutes)).toEqual([5, 15, 60, 360, 360, 360]);
    const id = await lead();
    const send = vi.fn(async () => { throw new Error("SharpSpring responded 500"); });
    const seen: number[] = [];
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await setup.query("UPDATE leads SET crm_next_try_at = now() - interval '1 minute' WHERE id = $1", [id]);
      await retryDueLeads(5, { query: setup.query, send, url: FAKE_URL });
      const state = await row(id);
      seen.push(state.mins);
      expect(state).toMatchObject({ crm_status: "pending", crm_attempts: attempt, err: "SharpSpring responded 500" });
    }
    expect(seen).toEqual([5, 15, 60, 360]);
  });

  it("marks the lead failed on the tenth failed attempt", async () => {
    const id = await lead({ attempts: 9 });
    await retryDueLeads(5, { query: setup.query, send: async () => { throw new Error("down"); }, url: FAKE_URL });
    expect(await row(id)).toMatchObject({ crm_status: "failed", crm_attempts: 10 });
    const send = vi.fn(async () => undefined);
    await retryDueLeads(5, { query: setup.query, send, url: FAKE_URL });
    expect(send).not.toHaveBeenCalled();
  });

  it("claims a lead so a second layer running at once does not send it again", async () => {
    await lead();
    const send = vi.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    await Promise.all([retryDueLeads(5, { query: setup.query, send, url: FAKE_URL }), retryDueLeads(5, { query: setup.query, send, url: FAKE_URL })]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("sends nothing and changes nothing when no postback URL is set", async () => {
    const id = await lead();
    const before = await setup.query("SELECT crm_status, crm_attempts, crm_next_try_at FROM leads WHERE id = $1", [id]);
    const send = vi.fn(async () => undefined);
    const result = await retryDueLeads(50, { query: setup.query, send, url: undefined });
    expect(send).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, failed: 0, remaining: 1 });
    expect(await setup.query("SELECT crm_status, crm_attempts, crm_next_try_at FROM leads WHERE id = $1", [id])).toEqual(before);
  });

  it("rebuilds the marketing URL from the session UTM on a retry", async () => {
    const id = await lead();
    await setup.query("UPDATE sessions SET utm = $1::jsonb", [JSON.stringify({ utm_source: "google" })]);
    const send = vi.fn(async (_url: string, _body: URLSearchParams) => undefined);
    await retryDueLeads(5, { query: setup.query, send, url: FAKE_URL });
    expect(send.mock.calls[0][1].get("204")).toBe("https://trustroyale-jade.vercel.app/?utm_source=google");
    expect((await row(id)).crm_status).toBe("synced");
  });
});

describe("GET /api/cron/crm-sync", () => {
  const authed = (header?: string) => ({ ...request("GET"), headers: { authorization: header } }) as ReturnType<typeof request>;

  it("answers 401 without the bearer secret", async () => {
    process.env.CRON_SECRET = "cron-secret-for-tests";
    const handler = createCrmSyncHandler({ url: undefined });
    for (const header of [undefined, "Bearer wrong", "cron-secret-for-tests"]) {
      const reply = response();
      await handler(authed(header), reply);
      expect(reply.statusCode).toBe(401);
    }
  });

  it("answers 401 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const reply = response();
    await createCrmSyncHandler({ url: undefined })(authed("Bearer "), reply);
    expect(reply.statusCode).toBe(401);
  });

  it("runs the retry job with the right bearer", async () => {
    process.env.CRON_SECRET = "cron-secret-for-tests";
    const database = await testDatabase();
    const reply = response();
    await createCrmSyncHandler({ query: database.query, url: undefined })(authed("Bearer cron-secret-for-tests"), reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ sent: 0, failed: 0, remaining: 0 });
    await database.database.close();
  });
});
