---
description: Use when one of your tools fails with an unexpected error (a database, network, or internal failure), to file an error report on your GitHub repository.
---

# Report an error

You can file error reports as GitHub issues on your own repository with the `github__list_error_reports` and `github__create_error_report` tools (call them through `eve__tool`).

## When to report

Report **unexpected failures**: a tool threw an error, or returned a database, network, timeout, or internal error.

Don't report **expected outcomes**. These are normal answers you handle in conversation:

- "No contact with id …"
- "That isn't a LinkedIn, X, or Bluesky profile link."
- Invalid input you can fix and retry, or something the owner needs to clarify.

## Steps

1. **Check for duplicates.** Call `github__list_error_reports`. If an open report already covers the same tool and the same error, don't file another; mention its issue number to the owner instead.
2. **File one report.** Call `github__create_error_report` once per turn at most, with:
   - `title`: `<tool name>: <short error summary>`, under 100 characters.
   - `labels`: `["agent-error"]`.
   - `body`, in Markdown:
     - **Tool:** the tool name.
     - **Error:** the error message, with personal data redacted (see below).
     - **What I was doing:** one generic sentence, such as "Saving a contact captured from a business card photo."
     - **Where:** web capture page, chat, email, or the weekly or daily schedule.
     - **When:** today's date.
3. **Tell the owner** in one sentence that the action failed and that you filed (or found) an error report, with the issue number. Don't retry a failed write unless the owner asks.
4. If filing the report fails too, say so and stop. Never loop on reporting.

## Privacy: the repository is public

Error reports are visible to anyone. Never include:

- Names, emails, phone numbers, companies, or social profile links of any contact.
- Notes, email text, or anything the owner said.
- Anything read from a photo.

Error messages can contain values, such as Postgres's `Key (email)=(priya@acme.dev)`. Replace every such value with `<redacted>`. When unsure, leave it out.
