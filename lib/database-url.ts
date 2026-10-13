/**
 * The Postgres connection string, with `sslmode` pinned to `verify-full`.
 *
 * Neon's URLs use `sslmode=require`. pg 8 already treats that as `verify-full` but warns that
 * pg 9 will switch to libpq's weaker meaning. Spelling out `verify-full` keeps full certificate
 * checks and silences the warning.
 */
export function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const mode = url.searchParams.get("sslmode");
    if (mode === "prefer" || mode === "require" || mode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return raw;
  }
}
