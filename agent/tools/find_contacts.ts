import { defineTool } from "eve/tools";
import { z } from "zod";
import { findContacts } from "../../lib/db";

export default defineTool({
  description: "Search saved contacts by name, company, email, or where you met. Returns up to 10 matches.",
  inputSchema: z.object({ query: z.string().trim().min(1) }),
  label: { start: ({ query }) => `Search contacts for “${query}”` },
  async execute({ query }) {
    return { contacts: await findContacts(query) };
  },
});
