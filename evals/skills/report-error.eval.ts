import { defineEval } from "eve/evals";

// A realistic Postgres error that embeds personal data the issue must not repeat.
const DB_ERROR =
  'duplicate key value violates unique constraint "contacts_email_key". Key (lower(email))=(priya@acme.dev) already exists.';

export default defineEval({
  description: "An unexpected tool failure loads report_error and files a redacted GitHub issue.",
  tags: ["skills", "connections"],
  async test(t) {
    const session = await t.session({
      stubs: [
        { id: "find", tool: "find_contacts", outcomes: [{ response: { contacts: [] } }] },
        { id: "save-fails", tool: "save_contact", outcomes: [{ throw: { message: DB_ERROR } }] },
        { id: "list", tool: "github__list_error_reports", outcomes: [{ response: { status: 200, statusText: "OK", body: [] } }] },
        {
          id: "create",
          tool: "github__create_error_report",
          outcomes: [{ response: { status: 201, statusText: "Created", body: { number: 42, html_url: "https://github.com/amyegan/PRM/issues/42" } } }],
        },
      ],
    });
    const turn = await session.send(
      "Save a contact: Priya Shah, Staff Engineer at Acme, priya@acme.dev. We met at Ship London.",
    );
    turn.expectOk();
    turn.calledTool("save_contact", { status: "failed" });
    turn.loadedSkill("report_error", { count: 1 });
    turn.calledTool("github__list_error_reports", { count: 1 });
    turn.calledTool("github__create_error_report", {
      count: 1,
      input: { body: { labels: ["agent-error"] } },
    });
    // The repo is public: no contact details in the issue.
    turn.eventsSatisfy("issue omits personal data", (events) =>
      events.every((event) => {
        if (event.type !== "actions.requested") return true;
        const text = JSON.stringify(event.data);
        return !text.includes("github__create_error_report") || !/priya|acme\.dev|Shah/i.test(text);
      }),
    );
    turn.messageIncludes("42");
  },
});
