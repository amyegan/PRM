import { todayContext } from "../../lib/config";
import type { Contact, ReconnectCandidate, Reminder } from "../../lib/db";

// Prompts for the scheduled emails. Shared with evals/ so they test exactly what the schedules
// send. Each names its skill so the agent loads the writing instructions every time.

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
    `${todayContext()} Load the weekly_digest_email and conversation_starters skills, then write this week's reconnect ` +
    `digest email for these contacts:\n\n${list}`
  );
}

export function dailyNewContactsPrompt(contacts: readonly Contact[]): string {
  return (
    `${todayContext()} Load the daily_new_contacts_email and conversation_starters skills, then write today's new contacts ` +
    `email for these ${contacts.length} contacts:\n\n${contacts.map(describe).join("\n")}`
  );
}

export function remindersPrompt(reminders: readonly Reminder[]): string {
  const list = reminders
    .map((r) => `- reminder ${r.id}${r.contactName ? ` (contact ${r.contactId}: ${r.contactName})` : ""}: ${r.note}`)
    .join("\n");
  return (
    `${todayContext()} These reminders are due. Write a short reminder email: one line per reminder in ` +
    "the owner's words. For reminders about a contact, load the conversation_starters skill and add one " +
    "starter. End by noting the owner can reply \"done\" or ask to push a reminder to another day. " +
    `No tables, under 150 words.\n\n${list}`
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
