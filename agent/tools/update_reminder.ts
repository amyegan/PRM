import { defineTool } from "eve/tools";
import { z } from "zod";
import { OWNER_TIMEZONE } from "../../lib/config";
import { updateReminder } from "../../lib/db";
import { reminderDate, reminderTime } from "../lib/reminder-schema";

export default defineTool({
  description:
    "Change a reminder: mark it done or cancelled, reopen it, edit its note, or reschedule it " +
    "(a new date or time means it's emailed again when due). Find its id with list_reminders.",
  inputSchema: z.object({
    reminderId: z.number().int(),
    status: z.enum(["open", "done", "cancelled"]).optional(),
    note: z.string().trim().min(1).max(500).optional(),
    dueDate: reminderDate.optional().describe("New day, YYYY-MM-DD"),
    dueTime: reminderTime.optional(),
  }),
  label: { start: ({ reminderId }) => `Update reminder #${reminderId}` },
  async execute({ reminderId, ...changes }) {
    return (
      (await updateReminder(reminderId, { ...changes, timeZone: OWNER_TIMEZONE })) ?? {
        error: `No reminder with id ${reminderId}`,
      }
    );
  },
});
