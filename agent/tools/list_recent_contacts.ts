import { defineTool } from "eve/tools";
import { z } from "zod";
import { listRecentContacts } from "../../lib/db";

export default defineTool({
  description:
    "List contacts you talked to recently, most recent first, with the last thing you talked about. " +
    'Use it for questions like "who did I talk to this week?" or "who have I met lately?". ' +
    "For people you're overdue to contact, use list_reconnect_candidates instead.",
  inputSchema: z.object({
    days: z.number().int().min(1).max(365).default(7).describe("How many days back to look"),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  label: { start: ({ days }) => `List contacts from the last ${days} days` },
  async execute({ days, limit }) {
    const contacts = await listRecentContacts(days, limit);
    return { days, contacts };
  },
});
