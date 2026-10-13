import { defineTool } from "eve/tools";
import { z } from "zod";
import { getContact } from "../../lib/db";

export default defineTool({
  description: "Get one contact with their 10 most recent interactions.",
  inputSchema: z.object({ contactId: z.number().int() }),
  async execute({ contactId }) {
    return (await getContact(contactId)) ?? { error: `No contact with id ${contactId}` };
  },
});
