import { defineTool } from "eve/tools";
import { z } from "zod";
import { OWNER_TIMEZONE, todayIso } from "../../lib/config";
import { listContactsAddedBetween } from "../../lib/db";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export default defineTool({
  description:
    "List and count contacts you added (met) between two dates, newest first. " +
    'Use it for "who did I meet this month?", "how many contacts did I add this week?", or ' +
    '"who did I meet at Ship London in October?". Work out the dates from today\'s date in your context: ' +
    "weeks start on Monday, and \"this month\" runs from the 1st through today. " +
    "For who you talked to recently, use list_recent_contacts instead.",
  inputSchema: z.object({
    from: isoDate.describe("First day to include, YYYY-MM-DD"),
    to: isoDate.optional().describe("Last day to include, YYYY-MM-DD. Defaults to today."),
    metAt: z.string().trim().min(1).optional().describe("Only contacts whose 'met at' matches, e.g. an event name"),
    limit: z.number().int().min(1).max(100).default(25).describe("Most contacts to list; the total still counts all"),
  }),
  label: { start: ({ from, to }) => `List contacts added ${from} to ${to ?? "today"}` },
  async execute({ from, to, metAt, limit }) {
    const end = to ?? todayIso();
    if (end < from) return { error: `"to" (${end}) is before "from" (${from}).` };
    const { total, contacts } = await listContactsAddedBetween({
      from,
      to: end,
      timeZone: OWNER_TIMEZONE,
      metAt,
      limit,
    });
    return { from, to: end, timeZone: OWNER_TIMEZONE, total, shown: contacts.length, contacts };
  },
});
