import { defineEval } from "eve/evals";
import { newContacts } from "./fixtures";

export default defineEval({
  description: "Date questions use list_contacts_added with real dates, and counts come from the total, not the list.",
  tags: ["tools"],
  async test(t) {
    const session = await t.session({
      stubs: [
        {
          id: "added",
          tool: "list_contacts_added",
          // 7 matches, but only 2 listed: the answer must say 7.
          outcomes: [{ response: { from: "2026-10-12", to: "2026-10-18", timeZone: "UTC", total: 7, shown: 2, contacts: newContacts } }],
        },
      ],
    });
    const turn = await session.send("How many contacts did I add this week?");
    turn.expectOk();
    turn.calledTool("list_contacts_added", { input: { from: /^\d{4}-\d{2}-\d{2}$/ } });
    turn.notCalledTool("list_recent_contacts");
    turn.messageIncludes(/\b7\b|seven/i);
  },
});
