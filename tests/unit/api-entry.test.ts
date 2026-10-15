import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createEntryHandler } from "../../api/entry";
import { createLeadHandler } from "../../api/lead";
import { DISCOUNT_FIELD } from "../../api/_lib/sharpspring";
import { request, response, testDatabase, testSession } from "./api-helpers";

process.env.SESSION_SECRET = "test-only-session-secret-at-least-32-bytes";
process.env.IP_HASH_SALT = "test-only-ip-hash-salt";
delete process.env.SHARPSPRING_POSTBACK_URL;

const FAKE_URL = "https://postback.invalid/receive";
const entry = { fullName: "Jane Smith", phone: "+44 (0)7911 123456", email: "jane@example.com", region: "Wales", website: "", marketingUrl: "https://game.example/?gclid=g9", ssTrackingId: "123456|0123456789abcdef01234567" };
const post = (cookie: string | undefined, body: unknown) => Object.assign(request("POST", cookie), { body });

describe("POST /api/entry", () => {
  let setup: Awaited<ReturnType<typeof testDatabase>>;
  beforeAll(async () => { setup = await testDatabase(); });
  afterAll(async () => { await setup.database.close(); });

  function handler(extra: Parameters<typeof createEntryHandler>[0] = {}) {
    const pending: Promise<unknown>[] = [];
    const send = vi.fn(async (_url: string, _body: URLSearchParams) => undefined);
    return { pending, send, run: createEntryHandler({ waitUntil: (work) => { pending.push(work); }, send, url: FAKE_URL, ...extra }) };
  }

  it("answers 403 without a valid session cookie and sends nothing", async () => {
    const { run, send, pending } = handler();
    for (const cookie of [undefined, "tr_sid=garbage"]) {
      const reply = response();
      await run(post(cookie, entry), reply);
      expect(reply.statusCode).toBe(403);
    }
    await Promise.all(pending);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects other methods with 405", async () => {
    const reply = response();
    await handler().run(request("GET"), reply);
    expect(reply.statusCode).toBe(405);
  });

  it("answers a filled honeypot with 202 and does nothing", async () => {
    const session = await testSession(setup.query);
    const { run, send, pending } = handler();
    const reply = response();
    await run(post(session.cookie, { ...entry, website: "http://spam.example" }), reply);
    expect(reply.statusCode).toBe(202);
    await Promise.all(pending);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing name or email, and for a present but invalid phone or region", async () => {
    const session = await testSession(setup.query);
    const { run, send } = handler();
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ...entry, fullName: "" }, "fullName"], [{ ...entry, email: "nope" }, "email"],
      [{ ...entry, phone: "123" }, "phone"], [{ ...entry, region: "Atlantis" }, "region"],
    ];
    for (const [body, field] of cases) {
      const reply = response();
      await run(post(session.cookie, body), reply);
      expect(reply.statusCode).toBe(400);
      expect(reply.body).toMatchObject({ error: "invalid", fields: { [field]: expect.any(String) } });
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("sends once with the entry source tag, no discount or win_ref, and the marketing fields", async () => {
    const session = await testSession(setup.query);
    const { run, send, pending } = handler();
    const reply = response();
    await run(post(session.cookie, entry), reply);
    expect(reply.statusCode).toBe(202);
    expect(reply.body).toEqual({ ok: true });
    await Promise.all(pending);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe(FAKE_URL);
    expect(Object.fromEntries(send.mock.calls[0][1])).toEqual({
      "1": "Jane Smith", "3": "07911123456", "4": "jane@example.com", "76": "2026 Trust Royale Game Entry",
      "204": "https://game.example/?gclid=g9", "234": "g9", "296": "Wales", trackingid__sb: "123456|0123456789abcdef01234567",
    });
    expect(send.mock.calls[0][1].has(DISCOUNT_FIELD)).toBe(false);
  });

  it("accepts a member with only name and email and omits fields 3 and 296", async () => {
    const session = await testSession(setup.query);
    const { run, send, pending } = handler();
    const reply = response();
    await run(post(session.cookie, { fullName: "Jane Smith", email: "jane@example.com" }), reply);
    expect(reply.statusCode).toBe(202);
    await Promise.all(pending);
    const body = send.mock.calls[0][1];
    expect(body.has("3")).toBe(false);
    expect(body.has("296")).toBe(false);
  });

  it("skips silently when no postback URL is set, and still answers 202", async () => {
    const session = await testSession(setup.query);
    const { run, send, pending } = handler({ url: undefined });
    const reply = response();
    await run(post(session.cookie, entry), reply);
    expect(reply.statusCode).toBe(202);
    await Promise.all(pending);
    expect(send).not.toHaveBeenCalled();
  });

  it("still answers 202 when the CRM send fails", async () => {
    const session = await testSession(setup.query);
    const { run, pending } = handler({ send: async () => { throw new Error("down"); } });
    const reply = response();
    await run(post(session.cookie, entry), reply);
    expect(reply.statusCode).toBe(202);
    await expect(Promise.all(pending)).resolves.toBeDefined();
  });
});

describe("POST /api/lead with optional phone and region", () => {
  let setup: Awaited<ReturnType<typeof testDatabase>>;
  beforeAll(async () => { setup = await testDatabase(); });
  afterAll(async () => { await setup.database.close(); });
  beforeEach(async () => { await setup.query("TRUNCATE leads, spins, sessions CASCADE"); });

  async function winningSession() {
    const session = await testSession(setup.query);
    const spinId = randomUUID();
    await setup.query("INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref) VALUES ($1, $2, 1, $3, 'keith-3', 15, 'TR-OPT234')", [spinId, session.id, ["keith", "keith", "keith"]]);
    await setup.query("UPDATE sessions SET spins_used = 3, won_spin_id = $1 WHERE id = $2", [spinId, session.id]);
    return { ...session, spinId };
  }

  it("stores NULL phone and region and posts without fields 3 and 296, plus the discount custom field", async () => {
    const session = await winningSession();
    const pending: Promise<unknown>[] = [];
    const send = vi.fn(async (_url: string, _body: URLSearchParams) => undefined);
    const run = createLeadHandler({ query: setup.query, waitUntil: (work) => { pending.push(work); }, send, url: FAKE_URL });
    const reply = response();
    await run(post(session.cookie, { fullName: "Jane Smith", email: "jane@example.com", phone: "", spinId: session.spinId }), reply);
    expect(reply.statusCode).toBe(201);
    expect(await setup.query("SELECT phone, region FROM leads")).toEqual([{ phone: null, region: null }]);
    await Promise.all(pending);
    const body = send.mock.calls[0][1];
    expect(body.has("3")).toBe(false);
    expect(body.has("296")).toBe(false);
    expect(body.get("discount")).toBe("15");
    expect(body.get(DISCOUNT_FIELD)).toBe("15");
    expect(body.get("76")).toBe("2026 Trust Royale Game Claim");
  });

  it("still rejects a non-empty invalid phone or region, and a missing name or email", async () => {
    const session = await winningSession();
    const run = createLeadHandler({ query: setup.query, waitUntil: () => undefined, url: undefined });
    for (const extra of [{ phone: "123" }, { region: "Atlantis" }, { fullName: "" }, { email: "" }]) {
      const reply = response();
      await run(post(session.cookie, { fullName: "Jane Smith", email: "jane@example.com", spinId: session.spinId, ...extra }), reply);
      expect(reply.statusCode).toBe(400);
    }
    expect(await setup.query("SELECT 1 FROM leads")).toHaveLength(0);
  });

  it("the retry path (a stored lead with NULL phone and region) also omits fields 3 and 296", async () => {
    const session = await winningSession();
    const { retryDueLeads } = await import("../../api/_lib/crmRetry");
    await setup.query(`INSERT INTO leads (id, spin_id, win_ref, discount, first_name, last_name, phone, email, region, consent_text, claimed_via)
      VALUES ($1, $2, 'TR-OPT234', 15, 'Jane', 'Smith', NULL, 'j@example.com', NULL, 'c', 'form')`, [randomUUID(), session.spinId]);
    const send = vi.fn(async (_url: string, _body: URLSearchParams) => undefined);
    await retryDueLeads(5, { query: setup.query, send, url: FAKE_URL });
    const body = send.mock.calls[0][1];
    expect(body.has("3")).toBe(false);
    expect(body.has("296")).toBe(false);
    expect(body.get(DISCOUNT_FIELD)).toBe("15");
  });
});
