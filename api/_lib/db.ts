import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;

function databaseClient(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return client ??= neon(databaseUrl);
}

const taggedSql = (strings: TemplateStringsArray, ...params: unknown[]) => databaseClient()(strings, ...params);

export const sql = new Proxy(taggedSql, {
  get(_target, property) {
    const value = databaseClient()[property as keyof NeonQueryFunction<false, false>];
    return typeof value === "function" ? value.bind(databaseClient()) : value;
  },
}) as NeonQueryFunction<false, false>;
