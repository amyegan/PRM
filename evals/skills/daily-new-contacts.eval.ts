import { defineEval } from "eve/evals";
import { dailyNewContactsPrompt } from "../../agent/lib/digest-prompts";
import { newContacts } from "./fixtures";

export default defineEval({
  description: "The daily schedule's prompt loads the daily_new_contacts_email skill and flags shared contacts.",
  tags: ["skills"],
  async test(t) {
    const session = await t.session({
      stubs: [{ id: "find", tool: "find_contacts", outcomes: [{ response: { contacts: [] } }] }],
    });
    const turn = await session.send(dailyNewContactsPrompt(newContacts));
    turn.expectOk();
    turn.loadedSkill("daily_new_contacts_email", { count: 1 });
    turn.loadedSkill("conversation_starters", { count: 1 });
    turn.loadedSkill("weekly_digest_email", { count: 0 });
    for (const contact of newContacts) turn.messageIncludes(contact.name);
    // Sam came from the public page, so the email should say so.
    turn.messageIncludes(/public page|shared/i);
    turn.notCalledTool("save_contact");
  },
});
