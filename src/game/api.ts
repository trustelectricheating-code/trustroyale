import type { Discount } from "../config/paytable";
import type { SymbolId } from "../config/symbols";

export type ServerState = "idle" | "last_chance" | "won" | "claimed" | "game_over";
export interface WinSummary { spinId: string; winRef: string; ruleId: string; discount: Discount; couponCode: string; reels: [SymbolId, SymbolId, SymbolId] }
export interface SessionResponse { spinsLeft: number; bonusAvailable: boolean; state: ServerState; win: WinSummary | null }
export interface SpinResponse {
  spinId: string;
  spinNo: number;
  reels: [SymbolId, SymbolId, SymbolId];
  strip: [[SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId]];
  outcome: "win" | "retry";
  ruleId: string | null;
  discount: Discount | null;
  couponCode: string | null;
  winRef: string | null;
  nearMiss: boolean;
  spinsLeft: number;
  bonusAvailable: boolean;
  isBonus: boolean;
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
export function spin(): Promise<SpinResponse> { return request<SpinResponse>("/api/spin", { method: "POST" }); }
