import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query as databaseQuery, type Query } from "./_lib/db.js";
import { error, json, methodNotAllowed } from "./_lib/http.js";
import { spinReels as roll, type ReelSpin } from "./_lib/rng.js";
import { getOrCreateSession } from "./_lib/session.js";
import { newWinRef as makeWinRef } from "./_lib/winRef.js";
import { evaluate } from "../src/game/evaluator.js";
import { couponFor } from "./_lib/coupons.js";

interface SpinDependencies {
  query?: Query;
  spinReels?: () => ReelSpin;
  newWinRef?: () => string;
}

interface InsertRow { spin_no: number }

function uniqueViolation(caught: unknown): boolean {
  return Boolean(caught && typeof caught === "object" && "code" in caught && caught.code === "23505");
}

async function terminalState(query: Query, sessionId: string): Promise<"won" | "game_over"> {
  const rows = await query<{ won_spin_id: string | null }>("SELECT won_spin_id FROM sessions WHERE id = $1", [sessionId]);
  return rows[0]?.won_spin_id ? "won" : "game_over";
}

export function createSpinHandler(dependencies: SpinDependencies = {}) {
  const query = dependencies.query ?? databaseQuery;
  const spinReels = dependencies.spinReels ?? roll;
  const newWinRef = dependencies.newWinRef ?? makeWinRef;

  return async function spinHandler(request: VercelRequest, response: VercelResponse): Promise<void> {
    if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
    try {
      const sessionId = await getOrCreateSession(request, response, query);
      const cap = Number.parseInt(process.env.DAILY_SESSIONS_PER_IP ?? "20", 10);
      if (cap > 0) {
        const counts = await query<{ count: number | string }>(`
          SELECT count(*) AS count
            FROM sessions
           WHERE ip_hash = (SELECT ip_hash FROM sessions WHERE id = $1)
             AND created_at >= date_trunc('day', now())
        `, [sessionId]);
        if (Number(counts[0]?.count ?? 0) > cap) return error(response, 429, "rate_limited");
      }

      const { reels, strip } = spinReels();
      if (strip[1].some((symbol, index) => symbol !== reels[index])) throw new Error("strip[1] must equal reels");
      const evaluation = evaluate(reels);
      const spinId = randomUUID();
      let winRef = evaluation.rule ? newWinRef() : null;
      let inserted: InsertRow[] = [];

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          inserted = await query<InsertRow>(`
            WITH s AS (
              UPDATE sessions
                 SET spins_used = spins_used + 1,
                     won_spin_id = CASE WHEN $5::text IS NOT NULL THEN $2::uuid END
               WHERE id = $1::uuid AND spins_used < 4 AND won_spin_id IS NULL
               RETURNING id, spins_used
            )
            INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref)
            SELECT $2::uuid, s.id, s.spins_used, $3::text[], $4::text, $6::smallint, $5::text FROM s
            RETURNING spin_no
          `, [sessionId, spinId, reels, evaluation.rule?.id ?? null, winRef, evaluation.rule?.discount ?? null]);
          break;
        } catch (caught) {
          if (!evaluation.rule || !uniqueViolation(caught) || attempt === 2) throw caught;
          winRef = newWinRef();
        }
      }

      if (!inserted[0]) return error(response, 403, "no_spins_left", { state: await terminalState(query, sessionId) });
      const spinNo = Number(inserted[0].spin_no);
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
        couponCode: evaluation.rule ? couponFor(evaluation.rule.discount) : null,
        winRef,
        nearMiss: evaluation.nearMiss,
        spinsLeft: evaluation.rule ? 0 : Math.max(0, 3 - spinNo),
        bonusAvailable: !evaluation.rule && spinNo === 3,
        isBonus: spinNo === 4,
      });
    } catch (caught) {
    error(response, 500, "server_error");
    }
  };
}

export default createSpinHandler();
