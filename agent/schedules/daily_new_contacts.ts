import { defineSchedule } from "eve/schedules";
import { type Contact, listContactsCreatedSince } from "../../lib/db";
import resend, { openOwnerThread } from "../channels/resend";

const DAY_MS = 24 * 60 * 60 * 1000;

export default defineSchedule({
  // Daily at 23:00 UTC (7pm US Eastern in summer), covering the previous 24 hours.
  cron: "0 23 * * *",
  async run({ to, waitUntil, appAuth }) {
    const contacts = await listContactsCreatedSince(new Date(Date.now() - DAY_MS));
    if (contacts.length === 0) return; // Nobody new today: skip the email.

    const threadId = await openOwnerThread(
      `New contacts today (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
    );

    waitUntil(
      to(resend, { adapterName: "resend", threadId }).send(
        `Today is ${new Date().toDateString()}. Write today's new contacts email for these ` +
          `${contacts.length} contacts:\n\n${contacts.map(describe).join("\n")}`,
        { auth: appAuth },
      ),
    );
  },
});

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
