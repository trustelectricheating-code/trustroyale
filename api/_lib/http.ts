import type { VercelResponse } from "@vercel/node";

export type ErrorBody = { error: string } & Record<string, unknown>;

export function json(response: VercelResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export function error(response: VercelResponse, status: number, code: string, details: Record<string, unknown> = {}): void {
  json(response, status, { error: code, ...details });
}

export function methodNotAllowed(response: VercelResponse, allowed: readonly string[]): void {
  response.setHeader("Allow", allowed.join(", "));
  error(response, 405, "method_not_allowed");
}
