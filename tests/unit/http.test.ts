import type { VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import { error, json, methodNotAllowed } from "../../api/_lib/http";

function responseDouble(): VercelResponse & { headers: Record<string, string>; payload?: string } {
  const response = {
    headers: {} as Record<string, string>,
    payload: undefined as string | undefined,
    setHeader: vi.fn((name: string, value: string) => { response.headers[name] = value; }),
    end: vi.fn((payload?: string) => { response.payload = payload; }),
    statusCode: 0,
  };
  return response as unknown as VercelResponse & { headers: Record<string, string>; payload?: string };
}

describe("HTTP helpers", () => {
  it("writes JSON with no-store headers", () => {
    const response = responseDouble();
    json(response, 201, { ok: true });
    expect(response.statusCode).toBe(201);
    expect(response.headers).toMatchObject({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    expect(response.payload).toBe('{"ok":true}');
  });

  it("uses uniform error shape and Allow header", () => {
    const response = responseDouble();
    error(response, 403, "no_spins_left", { state: "won" });
    expect(JSON.parse(response.payload!)).toEqual({ error: "no_spins_left", state: "won" });
    methodNotAllowed(response, ["GET", "POST"]);
    expect(response.headers.Allow).toBe("GET, POST");
    expect(JSON.parse(response.payload!)).toEqual({ error: "method_not_allowed" });
  });
});
