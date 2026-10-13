import { defineSchedule } from "eve/schedules";
import { listReconnectCandidates } from "../../lib/db";
import resend, { openOwnerThread } from "../channels/resend";

export default defineSchedule({
  // Mondays at 15:00 UTC. Vercel Cron evaluates schedules in UTC.
  cron: "0 15 * * 1",
  async run({ to, waitUntil, appAuth }) {
    const candidates = await listReconnectCandidates(5);
    if (candidates.length === 0) return; // Nothing overdue: skip this week's email.

    const threadId = await openOwnerThread(
      `Who to reconnect with this week (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
    );

    const list = candidates
      .map(
        (c) =>
          `- id ${c.id}: ${c.name}${c.title ? `, ${c.title}` : ""}${c.company ? ` at ${c.company}` : ""}. ` +
          `Met at: ${c.metAt ?? "unknown"}. ${c.daysSinceContact} days since last contact. ` +
          `Last interaction: ${c.lastInteraction ?? "none recorded"}.`,
      )
      .join("\n");

    waitUntil(
      to(resend, { adapterName: "resend", threadId }).send(
        `Today is ${new Date().toDateString()}. Write this week's reconnect digest email for these contacts:\n\n${list}`,
        { auth: appAuth },
      ),
    );
  },
});
