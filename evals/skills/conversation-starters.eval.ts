import { defineEval } from "eve/evals";
import { overdueContacts, priyaDetail } from "./fixtures";

export default defineEval({
  description: "Asking what to say to someone loads conversation_starters and builds on their history.",
  tags: ["skills"],
  async test(t) {
    const session = await t.session({
      stubs: [
        { id: "find", tool: "find_contacts", outcomes: [{ response: { contacts: [overdueContacts[0]] } }] },
        { id: "get", tool: "get_contact", outcomes: [{ response: priyaDetail }] },
      ],
    });
    const turn = await session.send("What should I say to Priya Shah? It's been a while.");
    turn.expectOk();
    turn.loadedSkill("conversation_starters", { count: 1 });
    turn.calledTool("get_contact");
    turn.messageIncludes(/Turborepo/i);
    // Drafting only: nothing is logged as a conversation.
    turn.notCalledTool("log_interaction");
  },
});
