import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// The database is lazily initialized so the app still runs locally without
// DATABASE_URL configured. Only code paths that actually need Postgres
// (cloud sync) will trigger the error.
let _db: ReturnType<typeof drizzle> | null = null;

function getConnection(): NonNullable<typeof _db> {
  if (_db) return _db;
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Cloud sync requires a Postgres database.",
    );
  }
  const sql = neon(connectionString);
  _db = drizzle(sql, { schema });
  return _db;
}

/** Proxy that defers connection until first actual use. */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const conn = getConnection();
    return conn[prop as keyof typeof conn];
  },
});
export type Database = ReturnType<typeof drizzle>;
