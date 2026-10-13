import { defineEval } from "eve/evals";

export default defineEval({
  description: "Expected outcomes, like a contact that doesn't exist, aren't reported as errors.",
  tags: ["skills", "connections"],
  async test(t) {
    const session = await t.session({
      stubs: [
        { id: "find", tool: "find_contacts", outcomes: [{ response: { contacts: [] } }] },
        { id: "get", tool: "get_contact", outcomes: [{ response: { error: "No contact with id 999" } }] },
        { id: "create", tool: "github__create_error_report", outcomes: [{ response: { status: 201, statusText: "Created", body: { number: 1 } } }] },
      ],
    });
    const turn = await session.send("When did I last talk to Zed Quill?");
    turn.expectOk();
    turn.loadedSkill("report_error", { count: 0 });
    turn.notCalledTool("github__create_error_report");
  },
});
