import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationsDirectory = fileURLToPath(new URL("../db/migrations/", import.meta.url));
const files = (await readdir(migrationsDirectory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort((left, right) => left.localeCompare(right));
// The HTTP driver cannot run multi-statement files, so migrations use a WebSocket pool with a real transaction.
const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const { rows: appliedRows } = await client.query("SELECT filename FROM schema_migrations");
  const applied = new Set(appliedRows.map((row) => String(row.filename)));

  for (const filename of files) {
    if (applied.has(filename)) continue;
    const source = await readFile(path.join(migrationsDirectory, filename), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(source);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    console.log(`Applied ${filename}`);
  }

  console.log(`Migrations current (${files.length} file${files.length === 1 ? "" : "s"})`);
} finally {
  client.release();
  await pool.end();
}
