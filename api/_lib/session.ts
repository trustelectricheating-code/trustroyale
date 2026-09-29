import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query as databaseQuery, type Query } from "./db.js";

export const SESSION_COOKIE = "tr_sid";
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

function requiredEnvironment(name: "SESSION_SECRET" | "IP_HASH_SALT"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSessionCookie(sessionId: string, secret = requiredEnvironment("SESSION_SECRET"), now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${sessionId}.${expiresAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySessionCookie(value: string, secret = requiredEnvironment("SESSION_SECRET"), now = Date.now()): string | null {
  const lastDot = value.lastIndexOf(".");
  if (lastDot < 0) return null;
  const payload = value.slice(0, lastDot);
  const supplied = value.slice(lastDot + 1);
  const expiryDot = payload.lastIndexOf(".");
  if (expiryDot < 0) return null;

  const sessionId = payload.slice(0, expiryDot);
  const expiresAt = Number(payload.slice(expiryDot + 1));
  if (!UUID_PATTERN.test(sessionId) || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return null;

  const expected = signature(payload, secret);
  const suppliedBytes = Uint8Array.from(Buffer.from(supplied));
  const expectedBytes = Uint8Array.from(Buffer.from(expected));
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return null;
  return sessionId;
}

function cookieValue(request: VercelRequest, name: string): string | undefined {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(cookie.slice(separator + 1).trim());
  }
  return undefined;
}

export function readSessionId(request: VercelRequest, now = Date.now()): string | null {
  const value = cookieValue(request, SESSION_COOKIE);
  return value ? verifySessionCookie(value, undefined, now) : null;
}

export function issueSessionCookie(response: VercelResponse, sessionId: string, now = Date.now()): void {
  const expires = new Date(now + SESSION_MAX_AGE_SECONDS * 1000).toUTCString();
  const value = signSessionCookie(sessionId, undefined, now);
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; Expires=${expires}; HttpOnly; Secure; SameSite=Lax`);
}

export function clientIp(request: VercelRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || request.socket.remoteAddress || "unknown";
}

export function hashIp(ip: string, salt = requiredEnvironment("IP_HASH_SALT")): string {
  return createHash("sha256").update(ip).update(salt).digest("hex");
}

export function readUtm(request: VercelRequest): Record<string, string> | null {
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const raw = request.query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) utm[key] = value;
  }
  return Object.keys(utm).length > 0 ? utm : null;
}

export async function getOrCreateSession(request: VercelRequest, response: VercelResponse, query: Query = databaseQuery): Promise<string> {
  const existing = readSessionId(request);
  if (existing) return existing;

  const sessionId = randomUUID();
  await query("INSERT INTO sessions (id, ip_hash, utm) VALUES ($1, $2, $3)", [sessionId, hashIp(clientIp(request)), readUtm(request)]);
  issueSessionCookie(response, sessionId);
  return sessionId;
}
