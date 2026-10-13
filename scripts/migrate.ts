import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("Set DATABASE_URL (run `vercel env pull .env.local` after adding Neon).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
await client.end();
console.log("Database schema is up to date.");
