import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { vi } from "vitest";
import type { Query } from "../../api/_lib/db";
import { signSessionCookie } from "../../api/_lib/session";

export async function testDatabase(): Promise<{ database: PGlite; query: Query }> {
  const database = new PGlite();
  await database.exec(await readFile("db/migrations/001_init.sql", "utf8"));
  return {
    database,
    query: async <T>(text: string, params: unknown[] = []) => (await database.query<T>(text, params)).rows,
  };
}

export async function testSession(query: Query): Promise<{ id: string; cookie: string }> {
  const id = randomUUID();
  await query("INSERT INTO sessions (id, ip_hash) VALUES ($1, $2)", [id, `hash-${id}`]);
  return { id, cookie: `tr_sid=${encodeURIComponent(signSessionCookie(id))}` };
}

export function request(method: string, cookie?: string): VercelRequest {
  return {
    method,
    headers: { cookie, "x-forwarded-for": "192.0.2.1" },
    query: {},
    socket: { remoteAddress: "192.0.2.1" },
  } as unknown as VercelRequest;
}

export function response(): VercelResponse & { headers: Record<string, string | string[]>; body?: unknown } {
  const result = {
    headers: {} as Record<string, string | string[]>,
    body: undefined as unknown,
    statusCode: 0,
    setHeader: vi.fn((name: string, value: string | string[]) => { result.headers[name] = value; }),
    end: vi.fn((payload?: string) => { result.body = payload ? JSON.parse(payload) : undefined; }),
  };
  return result as unknown as VercelResponse & { headers: Record<string, string | string[]>; body?: unknown };
}
