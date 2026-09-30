import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query as databaseQuery, type Query } from "./_lib/db.js";
import { error, json, methodNotAllowed } from "./_lib/http.js";
import { spinReels as roll, type ReelSpin, type SpinOptions } from "./_lib/rng.js";
import { clientIp, getOrCreateSession } from "./_lib/session.js";
import { newWinRef as makeWinRef } from "./_lib/winRef.js";
import { evaluate } from "../src/game/evaluator.js";
import { couponFor } from "./_lib/coupons.js";

interface SpinDependencies {
  query?: Query;
  spinReels?: (options?: SpinOptions) => ReelSpin;
  newWinRef?: () => string;
}

interface InsertRow { spin_no: number; best_spin_id: string | null; best_rule_id: string | null; best_discount: number | null; best_win_ref: string | null }

function uniqueViolation(caught: unknown): boolean {
  return Boolean(caught && typeof caught === "object" && "code" in caught && caught.code === "23505");
}

async function terminalState(query: Query, sessionId: string): Promise<"won" | "game_over"> {
  const rows = await query<{ won_spin_id: string | null; spins_used: number; discount: number | null }>(`
    SELECT s.won_spin_id, s.spins_used, best.discount
      FROM sessions s LEFT JOIN spins best ON best.id = s.won_spin_id
     WHERE s.id = $1
  `, [sessionId]);
  return rows[0]?.won_spin_id && (rows[0].spins_used >= 3 || rows[0].discount === 20) ? "won" : "game_over";
}

export function createSpinHandler(dependencies: SpinDependencies = {}) {
  const query = dependencies.query ?? databaseQuery;
  const spinReels = dependencies.spinReels ?? roll;
  const newWinRef = dependencies.newWinRef ?? makeWinRef;

  return async function spinHandler(request: VercelRequest, response: VercelResponse): Promise<void> {
    if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
    try {
      const sessionId = await getOrCreateSession(request, response, query);
      // Local `vercel dev` sees every test run as loopback, so the daily cap only applies to deployed traffic.
      const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(clientIp(request));
      const cap = local ? 0 : Number.parseInt(process.env.DAILY_SESSIONS_PER_IP ?? "20", 10);
      if (cap > 0) {
        const counts = await query<{ count: number | string }>(`
          SELECT count(*) AS count
            FROM sessions
           WHERE ip_hash = (SELECT ip_hash FROM sessions WHERE id = $1)
             AND created_at >= date_trunc('day', now())
        `, [sessionId]);
        if (Number(counts[0]?.count ?? 0) > cap) return error(response, 429, "rate_limited");
      }

      const sessionRows = await query<{ spins_used: number }>("SELECT spins_used FROM sessions WHERE id = $1", [sessionId]);
      const rolled = spinReels({ bonus: Number(sessionRows[0]?.spins_used ?? 0) >= 3 });
      const { reels, strip } = rolled;
      if (strip[1].some((symbol, index) => symbol !== reels[index])) throw new Error("strip[1] must equal reels");
      const evaluation = evaluate(reels);
      const spinId = randomUUID();
      let winRef = evaluation.rule ? newWinRef() : null;
      let inserted: InsertRow[] = [];

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          inserted = await query<InsertRow>(`
            WITH current AS (
              SELECT s.id, s.spins_used, s.won_spin_id,
                     best.rule_id AS best_rule_id, best.discount AS best_discount, best.win_ref AS best_win_ref
                FROM sessions s
                LEFT JOIN spins best ON best.id = s.won_spin_id
               WHERE s.id = $1::uuid
                 AND (s.spins_used < 3 OR (s.spins_used = 3 AND s.won_spin_id IS NULL))
                 AND COALESCE(best.discount, 0) < 20
               FOR UPDATE OF s
            ), s AS (
              UPDATE sessions target
                 SET spins_used = target.spins_used + 1,
                     won_spin_id = CASE
                       WHEN $6::smallint IS NOT NULL AND $6::smallint > COALESCE(current.best_discount, 0) THEN $2::uuid
                       ELSE current.won_spin_id
                     END
                FROM current
               WHERE target.id = current.id
               RETURNING target.id, target.spins_used, target.won_spin_id,
                         current.best_rule_id, current.best_discount, current.best_win_ref
            ), inserted AS (
              INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref)
              SELECT $2::uuid, s.id, s.spins_used, $3::text[], $4::text, $6::smallint, $5::text FROM s
              RETURNING id, session_id, spin_no
            )
            SELECT inserted.spin_no,
                   s.won_spin_id AS best_spin_id,
                   CASE WHEN $6::smallint IS NOT NULL AND $6::smallint > COALESCE(s.best_discount, 0) THEN $4::text ELSE s.best_rule_id END AS best_rule_id,
                   CASE WHEN $6::smallint IS NOT NULL AND $6::smallint > COALESCE(s.best_discount, 0) THEN $6::smallint ELSE s.best_discount END AS best_discount,
                   CASE WHEN $6::smallint IS NOT NULL AND $6::smallint > COALESCE(s.best_discount, 0) THEN $5::text ELSE s.best_win_ref END AS best_win_ref
              FROM inserted CROSS JOIN s
          `, [sessionId, spinId, reels, evaluation.rule?.id ?? null, winRef, evaluation.rule?.discount ?? null]);
          break;
        } catch (caught) {
          if (!evaluation.rule || !uniqueViolation(caught) || attempt === 2) throw caught;
          winRef = newWinRef();
        }
      }

      if (!inserted[0]) return error(response, 403, "no_spins_left", { state: await terminalState(query, sessionId) });
      const spinNo = Number(inserted[0].spin_no);
      const best = inserted[0].best_spin_id ? {
        spinId: inserted[0].best_spin_id,
        ruleId: inserted[0].best_rule_id,
        discount: inserted[0].best_discount,
        winRef: inserted[0].best_win_ref,
      } : null;
      const gameOver = inserted[0].best_discount === 20 || (spinNo >= 3 && best !== null) || spinNo === 4;
      const checked = evaluate(reels);
      if (checked.rule?.id !== evaluation.rule?.id) throw new Error("Evaluator result changed before response");
      json(response, 200, {
        spinId,
        spinNo,
        reels,
        strip,
        outcome: evaluation.rule ? "win" : "retry",
        ruleId: evaluation.rule?.id ?? null,
        discount: evaluation.rule?.discount ?? null,
        couponCode: gameOver && inserted[0].best_discount ? couponFor(inserted[0].best_discount as 10 | 15 | 20) : null,
        winRef,
        best,
        nearMiss: evaluation.nearMiss,
        spinsLeft: gameOver ? 0 : Math.max(0, 3 - spinNo),
        bonusAvailable: !best && spinNo === 3,
        isBonus: spinNo === 4,
        gameOver,
      });
    } catch (caught) {
    error(response, 500, "server_error");
    }
  };
}

export default createSpinHandler();
