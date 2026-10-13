import type { Contact, ReconnectCandidate } from "../../lib/db";

// Prompts for the scheduled emails. Shared with evals/ so they test exactly what the schedules
// send. Each names its skill so the agent loads the writing instructions every time.

const today = () => new Date().toDateString();

export function weeklyDigestPrompt(candidates: readonly ReconnectCandidate[]): string {
  const list = candidates
    .map(
      (c) =>
        `- id ${c.id}: ${c.name}${c.title ? `, ${c.title}` : ""}${c.company ? ` at ${c.company}` : ""}. ` +
        `Met at: ${c.metAt ?? "unknown"}. ${c.daysSinceContact} days since last contact. ` +
        `Last interaction: ${c.lastInteraction ?? "none recorded"}.`,
    )
    .join("\n");
  return (
    `Today is ${today()}. Load the weekly_digest_email and conversation_starters skills, then write this week's reconnect ` +
    `digest email for these contacts:\n\n${list}`
  );
}

export function dailyNewContactsPrompt(contacts: readonly Contact[]): string {
  return (
    `Today is ${today()}. Load the daily_new_contacts_email and conversation_starters skills, then write today's new contacts ` +
    `email for these ${contacts.length} contacts:\n\n${contacts.map(describe).join("\n")}`
  );
}

function describe(c: Contact): string {
  const details = [
    c.title && c.company ? `${c.title} at ${c.company}` : (c.title ?? c.company),
    c.email,
    c.phone,
    c.linkedin,
    c.x,
    c.bluesky,
    c.metAt && `met at ${c.metAt}`,
    c.notes && `notes: ${c.notes}`,
  ].filter(Boolean);
  const source = c.source === "shared" ? "shared via your public page" : "you captured";
  return `- id ${c.id}: ${c.name} (${source})${details.length > 0 ? `. ${details.join("; ")}` : ""}`;
}
