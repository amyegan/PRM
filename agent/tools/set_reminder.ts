import { defineTool } from "eve/tools";
import { z } from "zod";
import { OWNER_TIMEZONE } from "../../lib/config";
import { createReminder } from "../../lib/db";
import { reminderDate, reminderTime } from "../lib/reminder-schema";

export default defineTool({
  description:
    'Set a reminder for the owner, e.g. "remind me to send Priya the deck on Tuesday". ' +
    "Work out the date from today's date in your context. Link it to a contact when it's about someone " +
    "(look them up with find_contacts first). Reminders arrive by email once they're due.",
  inputSchema: z.object({
    note: z.string().trim().min(1).max(500).describe("What to remember, in the owner's words"),
    dueDate: reminderDate.describe("Day it's due, YYYY-MM-DD"),
    dueTime: reminderTime.optional(),
    contactId: z.number().int().optional().describe("The contact this is about, if any"),
  }),
  label: { start: ({ dueDate }) => `Set a reminder for ${dueDate}` },
  async execute({ note, dueDate, dueTime, contactId }) {
    const reminder = await createReminder({ note, dueDate, dueTime, contactId, timeZone: OWNER_TIMEZONE });
    return {
      reminder,
      delivery:
        "Emailed in the first reminder run at or after the due time. Runs are daily by default " +
        "(REMINDER_CRON), so a time of day may arrive with that day's run rather than exactly on time.",
    };
  },
});
