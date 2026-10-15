import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let database: PGlite;

beforeAll(async () => {
  database = new PGlite();
  for (const file of (await readdir("db/migrations")).filter((name) => /^\d+.*\.sql$/.test(name)).sort()) {
    await database.exec(await readFile(`db/migrations/${file}`, "utf8"));
  }
});

afterAll(async () => {
  await database.close();
});

describe("initial PostgreSQL migration", () => {
  it("creates sessions, spins, leads, and the CRM retry index", async () => {
    const tables = await database.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    expect(tables.rows.map(({ table_name }) => table_name)).toEqual(["leads", "sessions", "spins"]);

    const indexes = await database.query<{ indexname: string }>("SELECT indexname FROM pg_indexes WHERE tablename = 'leads'");
    expect(indexes.rows.map(({ indexname }) => indexname)).toContain("leads_crm_retry_idx");
  });

  it("enforces CHECK and UNIQUE constraints", async () => {
    await expect(database.query("INSERT INTO sessions (id, spins_used) VALUES ($1, 5)", ["00000000-0000-4000-8000-000000000001"])).rejects.toThrow();

    const sessionId = "00000000-0000-4000-8000-000000000002";
    await database.query("INSERT INTO sessions (id) VALUES ($1)", [sessionId]);
    await expect(database.query(
      "INSERT INTO spins (id, session_id, spin_no, reels) VALUES ($1, $2, 1, ARRAY['scott', 'fiona'])",
      ["00000000-0000-4000-8000-000000000003", sessionId],
    )).rejects.toThrow();

    await database.query(
      "INSERT INTO spins (id, session_id, spin_no, reels) VALUES ($1, $2, 1, ARRAY['scott', 'fiona', 'gia'])",
      ["00000000-0000-4000-8000-000000000004", sessionId],
    );
    await expect(database.query(
      "INSERT INTO spins (id, session_id, spin_no, reels) VALUES ($1, $2, 1, ARRAY['cherry', 'seven', 'sweets'])",
      ["00000000-0000-4000-8000-000000000005", sessionId],
    )).rejects.toThrow();
  });

  it("allows the deferred sessions-to-spins foreign key within one transaction", async () => {
    const sessionId = "00000000-0000-4000-8000-000000000006";
    const spinId = "00000000-0000-4000-8000-000000000007";
    await database.transaction(async (transaction) => {
      await transaction.query("INSERT INTO sessions (id, won_spin_id) VALUES ($1, $2)", [sessionId, spinId]);
      await transaction.query(
        "INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref) VALUES ($1, $2, 1, ARRAY['neos', 'neos', 'neos'], 'neos-3', 10, 'TR-TEST')",
        [spinId, sessionId],
      );
    });

    const constraint = await database.query<{ condeferrable: boolean; condeferred: boolean }>(
      "SELECT condeferrable, condeferred FROM pg_constraint WHERE conname = 'sessions_won_spin_id_fkey'",
    );
    expect(constraint.rows).toEqual([{ condeferrable: true, condeferred: true }]);
  });

  it("adds a nullable region and relaxes postcode (002)", async () => {
    const columns = await database.query<{ column_name: string; is_nullable: string }>(
      "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'leads' AND column_name IN ('region', 'postcode') ORDER BY column_name",
    );
    expect(columns.rows).toEqual([{ column_name: "postcode", is_nullable: "YES" }, { column_name: "region", is_nullable: "YES" }]);
  });
});

import { readFileSync as readMigration } from "node:fs";
describe("003_lead_full_name migration", () => {
  it("drops and re-adds the last_name check so a one-word name can be stored", () => {
    const sql = readMigration(new URL("../../db/migrations/003_lead_full_name.sql", import.meta.url), "utf8");
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS leads_last_name_check");
    expect(sql).toMatch(/ADD CONSTRAINT leads_last_name_check CHECK \(char_length\(last_name\) <= 80\)/);
  });
});
