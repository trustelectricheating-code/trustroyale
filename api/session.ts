import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query as databaseQuery, type Query } from "./_lib/db";
import { error, json, methodNotAllowed } from "./_lib/http";
import { getOrCreateSession } from "./_lib/session";

interface SessionRow {
  spins_used: number;
  won_spin_id: string | null;
  spin_id: string | null;
  win_ref: string | null;
  rule_id: string | null;
  discount: number | null;
  reels: string[] | null;
  claimed: boolean;
}

export function createSessionHandler({ query = databaseQuery }: { query?: Query } = {}) {
  return async function sessionHandler(request: VercelRequest, response: VercelResponse): Promise<void> {
    if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
    try {
      const sessionId = await getOrCreateSession(request, response, query);
      const rows = await query<SessionRow>(`
        SELECT s.spins_used, s.won_spin_id,
               sp.id AS spin_id, sp.win_ref, sp.rule_id, sp.discount, sp.reels,
               EXISTS (SELECT 1 FROM leads l WHERE l.spin_id = sp.id) AS claimed
          FROM sessions s
          LEFT JOIN spins sp ON sp.id = s.won_spin_id
         WHERE s.id = $1
      `, [sessionId]);
      const row = rows[0];
      if (!row) throw new Error("Session was not found after creation");

      const won = row.won_spin_id !== null;
      const state = won ? (row.claimed ? "claimed" : "won")
        : row.spins_used >= 4 ? "game_over"
          : row.spins_used === 3 ? "last_chance"
            : "idle";
      json(response, 200, {
        spinsLeft: won ? 0 : Math.max(0, 3 - row.spins_used),
        bonusAvailable: !won && row.spins_used === 3,
        state,
        win: won ? {
          spinId: row.spin_id,
          winRef: row.win_ref,
          ruleId: row.rule_id,
          discount: row.discount,
          reels: row.reels,
        } : null,
      });
    } catch (caught) {
      console.error(caught);
      error(response, 500, "server_error");
    }
  };
}

export default createSessionHandler();
