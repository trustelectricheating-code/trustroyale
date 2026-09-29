import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { describe, expect, it } from "vitest";
import { createSessionHandler } from "../../api/session";
import { createSpinHandler } from "../../api/spin";
import type { Query } from "../../api/_lib/db";
import { request, response } from "./api-helpers";

const testUrl = process.env.TEST_DATABASE_URL;
const suite = testUrl ? describe : describe.skip;

suite("API integration with TEST_DATABASE_URL", () => {
  it("runs session and four-spin limits against the test database", async () => {
    const client = neon(testUrl!);
    const query: Query = async <T>(text: string, params: unknown[] = []) => await client.query(text, params) as T[];
    const ip = `test-${randomUUID()}`;
    const sessionReply = response();
    const firstRequest = request("GET");
    firstRequest.headers["x-forwarded-for"] = ip;
    await createSessionHandler({ query })(firstRequest, sessionReply);
    expect(sessionReply.body).toEqual({ spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null });
    const setCookie = sessionReply.headers["Set-Cookie"] as string;
    const cookie = setCookie.split(";")[0];
    const handler = createSpinHandler({
      query,
      spinReels: () => ({ reels: ["seven", "cherry", "sweets"], strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]] }),
      newWinRef: () => "TR-ABC234",
    });
    for (let spin = 0; spin < 4; spin += 1) await handler(request("POST", cookie), response());
    const denied = response();
    await handler(request("POST", cookie), denied);
    expect(denied.body).toEqual({ error: "no_spins_left", state: "game_over" });
  });
});
