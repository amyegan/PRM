import { defineTool } from "eve/tools";
import { z } from "zod";
import { updateContact } from "../../lib/db";
import { contactFieldsSchema } from "../lib/contact-schema";

export default defineTool({
  description:
    "Update a contact's details, reconnect cadence, or snooze them. Only the fields you pass change; " +
    "pass an empty string to clear a field.",
  inputSchema: contactFieldsSchema.partial().extend({
    contactId: z.number().int(),
    snoozedUntil: z
      .string()
      .datetime({ offset: true })
      .optional()
      .describe("Leave this contact out of reconnect suggestions until this ISO date"),
  }),
  label: { start: ({ contactId }) => `Update contact #${contactId}` },
  async execute({ contactId, ...fields }) {
    return (await updateContact(contactId, fields)) ?? { error: `No contact with id ${contactId}` };
  },
});
