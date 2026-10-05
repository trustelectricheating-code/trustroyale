import type { Discount } from "../config/paytable";
import type { SymbolId } from "../config/symbols";
import { isValidSsTrackingId, type LeadFieldErrors, type LeadInput } from "./leadValidation";

export type ServerState = "idle" | "last_chance" | "won" | "claimed" | "game_over";
export interface WinSummary { spinId: string; winRef: string; ruleId: string; discount: Discount; reels: [SymbolId, SymbolId, SymbolId] }
export interface BestSummary { spinId: string; winRef: string; ruleId: string; discount: Discount }
export interface SessionResponse { spinsLeft: number; bonusAvailable: boolean; state: ServerState; best: BestSummary | null; win: WinSummary | null }
export interface SpinResponse {
  spinId: string;
  spinNo: number;
  reels: [SymbolId, SymbolId, SymbolId];
  strip: [[SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId]];
  outcome: "win" | "retry";
  ruleId: string | null;
  discount: Discount | null;
  winRef: string | null;
  best: BestSummary | null;
  nearMiss: boolean;
  spinsLeft: number;
  bonusAvailable: boolean;
  isBonus: boolean;
  gameOver: boolean;
}
export type GameApiErrorCode = "no_spins_left" | "rate_limited" | "server_error" | "network_error";

export class GameApiError extends Error {
  constructor(public readonly code: GameApiErrorCode, public readonly status: number, public readonly state?: "won" | "game_over") {
    super(code);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  } catch {
    throw new GameApiError("network_error", 0);
  }
  const body = await response.json().catch(() => ({})) as { error?: string; state?: "won" | "game_over" };
  if (!response.ok) {
    const code = response.status === 403 ? "no_spins_left" : response.status === 429 ? "rate_limited" : "server_error";
    throw new GameApiError(code, response.status, body.state);
  }
  return body as T;
}

export function getSession(): Promise<SessionResponse> { return request<SessionResponse>(`/api/session${location.search}`); }
export async function spin(): Promise<SpinResponse> {
  const body = await request<SpinResponse>("/api/spin", { method: "POST" });
  if (!Array.isArray(body.reels) || !Array.isArray(body.strip) || body.strip.length !== 3) throw new GameApiError("server_error", 200);
  return body;
}

const SS_TRACKING_KEY = "trustRoyaleSsTk";

/** Remember the landing page's SharpSpring tracking id (URL param ss_tk) for the claim post. */
export function captureSsTracking(): void {
  try {
    const value = new URLSearchParams(location.search).get("ss_tk");
    if (isValidSsTrackingId(value)) sessionStorage.setItem(SS_TRACKING_KEY, value);
  } catch {
    // Storage can be blocked; the claim still works without a tracking id.
  }
}

function storedSsTracking(): string | undefined {
  try {
    const value = sessionStorage.getItem(SS_TRACKING_KEY);
    return isValidSsTrackingId(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export interface ClaimDetails extends LeadInput { spinId: string; website: string }
export interface ClaimResult { winRef: string; duplicate: boolean }
export class ClaimError extends Error {
  constructor(public readonly kind: "invalid" | "failed", public readonly fields: LeadFieldErrors = {}) {
    super(kind);
  }
}

export async function claimLead(details: ClaimDetails): Promise<ClaimResult> {
  let response: Response;
  try {
    response = await fetch("/api/lead", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ ...details, marketingUrl: location.href, ssTrackingId: storedSsTracking() }),
    });
  } catch {
    throw new ClaimError("failed");
  }
  const body = await response.json().catch(() => ({})) as { winRef?: string; duplicate?: boolean; fields?: LeadFieldErrors };
  if (response.status === 400) throw new ClaimError("invalid", body.fields ?? {});
  if (!response.ok || typeof body.winRef !== "string") throw new ClaimError("failed");
  return { winRef: body.winRef, duplicate: body.duplicate === true };
}
