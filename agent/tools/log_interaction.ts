import { defineTool } from "eve/tools";
import { z } from "zod";
import { logInteraction } from "../../lib/db";

export default defineTool({
  description:
    "Record that you talked to a contact (a meeting, call, email, or message). " +
    "This updates when you last talked and clears any snooze.",
  inputSchema: z.object({
    contactId: z.number().int(),
    summary: z.string().trim().min(1).describe("One or two sentences on what you talked about"),
    occurredAt: z
      .string()
      .datetime({ offset: true })
      .optional()
      .describe("When it happened, as an ISO date. Defaults to now."),
  }),
  label: { start: ({ contactId }) => `Log interaction with contact #${contactId}` },
  async execute({ contactId, summary, occurredAt }) {
    return (await logInteraction(contactId, summary, occurredAt)) ?? { error: `No contact with id ${contactId}` };
  },
});
