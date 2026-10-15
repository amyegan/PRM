import { defineSchedule } from "eve/schedules";
import { listContactsCreatedSince } from "../../lib/db";
import resend, { openOwnerThread } from "../channels/resend";
import { dailyNewContactsPrompt } from "../lib/digest-prompts";

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
        dailyNewContactsPrompt(contacts),
        { auth: appAuth },
      ),
    );
  },
});
