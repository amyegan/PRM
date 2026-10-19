import { defineTool } from "eve/tools";
import { z } from "zod";
import { listReminders } from "../../lib/db";

export default defineTool({
  description:
    "List the owner's reminders, soonest first. Open reminders include ones already emailed (sentAt set) " +
    "that haven't been marked done.",
  inputSchema: z.object({
    status: z.enum(["open", "done", "cancelled", "all"]).default("open"),
    contactId: z.number().int().optional().describe("Only reminders about this contact"),
  }),
  async execute({ status, contactId }) {
    return { reminders: await listReminders({ status, contactId }) };
  },
});
