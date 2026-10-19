import { defineEval } from "eve/evals";
import { overdueContacts } from "./fixtures";

export default defineEval({
  description: "A reminder request resolves the date, links the contact, and calls set_reminder.",
  tags: ["tools"],
  async test(t) {
    const priya = overdueContacts[0];
    const session = await t.session({
      stubs: [
        { id: "find", tool: "find_contacts", outcomes: [{ response: { contacts: [priya] } }] },
        {
          id: "set",
          tool: "set_reminder",
          outcomes: [{
            response: {
              reminder: { id: 7, contactId: priya.id, contactName: priya.name, note: "Send Priya the deck", dueAt: "2026-10-27T13:00:00.000Z", status: "open", sentAt: null },
              delivery: "Emailed in the first reminder run at or after the due time.",
            },
          }],
        },
      ],
    });
    const turn = await session.send("Remind me to send Priya Shah the deck next Tuesday.");
    turn.expectOk();
    turn.calledTool("find_contacts");
    turn.calledTool("set_reminder", {
      count: 1,
      input: { contactId: priya.id, dueDate: /^\d{4}-\d{2}-\d{2}$/ },
    });
    turn.notCalledTool("log_interaction");
  },
});
