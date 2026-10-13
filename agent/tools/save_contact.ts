import { defineTool } from "eve/tools";
import { saveContact } from "../../lib/db";
import { contactFieldsSchema } from "../lib/contact-schema";

export default defineTool({
  description:
    "Save a new contact. If a contact with the same email already exists, the new details are merged into it. " +
    "Call find_contacts first when there is no email, so you don't create a duplicate.",
  inputSchema: contactFieldsSchema,
  label: { start: ({ name }) => `Save ${name}` },
  async execute(input) {
    return saveContact(input);
  },
});
