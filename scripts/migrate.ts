import { readFile } from "node:fs/promises";
import pg from "pg";
import { databaseUrl } from "../lib/database-url.ts";

// `--if-configured` lets the Vercel build skip migrations for projects without a database yet.
const ifConfigured = process.argv.includes("--if-configured");

const url = databaseUrl();
if (!url) {
  if (ifConfigured) {
    console.warn("DATABASE_URL is not set; skipping database migration.");
    process.exit(0);
  }
  console.error(
    "DATABASE_URL is not set. Neon's variables are Secret, so the Vercel CLI can't pull them;\n" +
      "migrations run automatically during `eve deploy`. To migrate from your machine, copy the\n" +
      "connection string from the Neon dashboard into .env.development.local.",
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
await client.end();
console.log("Database schema is up to date.");
