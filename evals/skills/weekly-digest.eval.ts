import { defineEval } from "eve/evals";
import { weeklyDigestPrompt } from "../../agent/lib/digest-prompts";
import { overdueContacts } from "./fixtures";

export default defineEval({
  description: "The weekly schedule's prompt loads the weekly_digest_email skill and writes the digest.",
  tags: ["skills"],
  async test(t) {
    const session = await t.session({
      // The digest is written from the prompt alone; stubs keep any lookups off the database.
      stubs: [{ id: "find", tool: "find_contacts", outcomes: [{ response: { contacts: overdueContacts } }] }],
    });
    const turn = await session.send(weeklyDigestPrompt(overdueContacts));
    turn.expectOk();
    turn.loadedSkill("weekly_digest_email", { count: 1 });
    turn.loadedSkill("daily_new_contacts_email", { count: 0 });
    for (const contact of overdueContacts) turn.messageIncludes(contact.name);
    turn.notCalledTool("save_contact");
    turn.notCalledTool("log_interaction");
  },
});
