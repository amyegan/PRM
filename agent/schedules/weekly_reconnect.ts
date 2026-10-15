import { defineSchedule } from "eve/schedules";
import { listReconnectCandidates } from "../../lib/db";
import resend, { openOwnerThread } from "../channels/resend";
import { weeklyDigestPrompt } from "../lib/digest-prompts";

export default defineSchedule({
  // Mondays at 15:00 UTC. Vercel Cron evaluates schedules in UTC.
  cron: "0 15 * * 1",
  async run({ to, waitUntil, appAuth }) {
    const candidates = await listReconnectCandidates(5);
    if (candidates.length === 0) return; // Nothing overdue: skip this week's email.

    const threadId = await openOwnerThread(
      `Who to reconnect with this week (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
    );

    waitUntil(
      to(resend, { adapterName: "resend", threadId }).send(
        weeklyDigestPrompt(candidates),
        { auth: appAuth },
      ),
    );
  },
});
