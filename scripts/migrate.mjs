import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationsDirectory = fileURLToPath(new URL("../db/migrations/", import.meta.url));
const files = (await readdir(migrationsDirectory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort((left, right) => left.localeCompare(right));
const sql = neon(databaseUrl);

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
const appliedRows = await sql`SELECT filename FROM schema_migrations`;
const applied = new Set(appliedRows.map((row) => String(row.filename)));

for (const filename of files) {
  if (applied.has(filename)) continue;
  const source = await readFile(path.join(migrationsDirectory, filename), "utf8");
  await sql.transaction((transaction) => [
    transaction.query(source),
    transaction`INSERT INTO schema_migrations (filename) VALUES (${filename})`,
  ]);
  console.log(`Applied ${filename}`);
}

console.log(`Migrations current (${files.length} file${files.length === 1 ? "" : "s"})`);
