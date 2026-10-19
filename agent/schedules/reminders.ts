import { defineSchedule } from "eve/schedules";
import { claimDueReminders, releaseReminders } from "../../lib/db";
import resend, { openOwnerThread } from "../channels/resend";
import { remindersPrompt } from "../lib/digest-prompts";

export default defineSchedule({
  // Default: daily at 13:00 UTC (about 9am US Eastern), which Vercel's Hobby plan allows.
  // On Pro, run it more often (e.g. "*/15 * * * *") so timed reminders arrive close to their time.
  cron: process.env.REMINDER_CRON || "0 13 * * *",
  async run({ to, waitUntil, appAuth }) {
    const due = await claimDueReminders();
    if (due.length === 0) return; // Nothing due: no email.

    waitUntil(
      (async () => {
        try {
          const threadId = await openOwnerThread(due.length === 1 ? `Reminder: ${due[0].note}` : `${due.length} reminders`);
          await to(resend, { adapterName: "resend", threadId }).send(remindersPrompt(due), { auth: appAuth });
        } catch (error) {
          // Unclaim so the next run tries again instead of silently dropping them.
          await releaseReminders(due.map((r) => r.id));
          throw error;
        }
      })(),
    );
  },
});
