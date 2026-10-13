import { defineEval } from "eve/evals";
import { shipLondonContacts } from "./fixtures";

export default defineEval({
  description: "Ordinary questions don't load the digest-writing skills.",
  tags: ["skills"],
  async test(t) {
    const session = await t.session({
      stubs: [{ id: "find", tool: "find_contacts", outcomes: [{ response: { contacts: shipLondonContacts } }] }],
    });
    const turn = await session.send("Who did I meet at Ship London?");
    turn.expectOk();
    turn.calledTool("find_contacts");
    turn.loadedSkill("weekly_digest_email", { count: 0 });
    turn.loadedSkill("daily_new_contacts_email", { count: 0 });
    turn.loadedSkill("conversation_starters", { count: 0 });
    turn.messageIncludes("Dana Lee");
  },
});
