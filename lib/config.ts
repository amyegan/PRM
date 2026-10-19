// Settings a fork is likely to change. Secrets and credentials are read where they're used;
// see .env.example for the full list.

/** Shown in the web app, as the email sender name, and as the chat bot's name. NEXT_PUBLIC_ so client components can read it. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "PRM";

/** AI Gateway model ID for the agent and the public share page's card reader. Must accept images. */
export const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-5.5";

/** IANA time zone for "today", "this week", and date ranges, e.g. "America/New_York". Defaults to UTC. */
export const OWNER_TIMEZONE = validTimeZone(process.env.OWNER_TIMEZONE) ?? "UTC";

function validTimeZone(zone: string | undefined): string | undefined {
  if (!zone) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    console.warn(`OWNER_TIMEZONE "${zone}" isn't a valid time zone; using UTC.`);
    return undefined;
  }
}

/** Today's date in the owner's time zone as YYYY-MM-DD. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: OWNER_TIMEZONE }).format(new Date());
}

/** The "Today is …" line every agent turn gets, in the owner's time zone. */
export function todayContext(): string {
  const long = new Intl.DateTimeFormat("en-US", {
    timeZone: OWNER_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  return `Today is ${long} (${todayIso()}, ${OWNER_TIMEZONE}).`;
}
