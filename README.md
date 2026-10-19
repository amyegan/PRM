# PRM: a personal relationship manager agent

Paste a LinkedIn, X, or Bluesky link, or snap a photo of a business card, and an [eve](https://eve.dev) agent saves the contact. A public share page lets people send you their own details. Every Monday the agent emails you who you're overdue to reconnect with. Reply in plain language ("Had coffee with Priya on Tuesday, she's moving to Stripe") and it updates your contacts.

## How it works

```
 Browser ──photo──▶ /eve/v1/session ──▶ ┌────────────┐ ──▶ AI Gateway (vision model)
                                        │ eve agent  │
 Vercel Cron ──Mon 15:00 UTC──────────▶ │            │ ──▶ Postgres (Neon)
                                        │  6 tools   │
 Resend ◀──digest email── Chat SDK ◀─── │            │
 Resend ──your reply──▶ /eve/v1/resend ▶└────────────┘
```

| Piece | Where |
| --- | --- |
| Agent instructions | `agent/instructions.md` |
| Model (via AI Gateway) | `agent/agent.ts` |
| Contact tools: save, find, get, update, log interaction, list overdue, list by date added, set and manage reminders, look up a social profile | `agent/tools/` |
| Email channel (Chat SDK + Resend adapter) | `agent/channels/resend.ts` |
| Facebook Messenger channel (Chat SDK) | `agent/channels/messenger.ts` |
| Web channel with password auth | `agent/channels/eve.ts` |
| Weekly digest, daily new-contacts email, and reminders | `agent/schedules/` |
| Skills: how to write each scheduled email, loaded only when a schedule fires | `agent/skills/` |
| GitHub connection: the agent files its own error reports as issues | `agent/connections/github.ts`, `agent/skills/report_error.md` |
| Evals for the skills | `evals/skills/` |
| Database queries, shared by the agent and the pages | `lib/db.ts`, `db/schema.sql` |
| Capture page, contacts list, chat | `app/page.tsx`, `app/contacts/`, `app/s/` |
| Public share page | `app/share/`, `lib/share.ts`, `lib/social.ts` |

The agent has no shell, file, or web tools (`defaultTools: false`). It can only read and write your contacts.

## Fork it

Everything deployment-specific comes from environment variables; nothing in the code points at the original author's accounts. `.env.example` lists every variable with what it does. Only `DATABASE_URL`, `APP_PASSWORD`, and `OWNER_EMAIL` are required. Email, Messenger, the share page, and GitHub error reports each switch off when their variables are unset. To make it yours, also consider `NEXT_PUBLIC_APP_NAME` (the app and bot name), `AGENT_MODEL`, `OWNER_TIMEZONE` (for "this week" and other date questions), and `WEEKLY_DIGEST_CRON` / `DAILY_DIGEST_CRON` (schedules run in UTC).

## Deploy

You need a Vercel account and a [Resend](https://resend.com) account. Both have free tiers.

1. **Create the Vercel project.**

   ```bash
   npm install
   npx eve link
   ```

2. **Add a database.** In the Vercel dashboard, open the project's **Storage** tab, add **Neon** from the Marketplace, and connect it to the project. This sets `DATABASE_URL`. The tables are created during each deploy (`npm run build` runs `scripts/migrate.ts` first, and the schema is safe to re-run).

   Neon's variables are Secret, so `vercel env pull` can't download them. For local development, copy the connection string from the Neon dashboard (ideally a separate dev branch) into `.env.development.local` as `DATABASE_URL`, then run `npm run db:migrate`.

3. **Add Resend.** In the project's **Integrations** tab (or `vercel integration add resend`), install Resend and pick a domain. This sets `RESEND_API_KEY` and `RESEND_EMAIL_DOMAIN`, and the agent sends from `prm@<RESEND_EMAIL_DOMAIN>`. In the Resend dashboard, make sure receiving is turned on for that domain (its MX record is added), so your replies come back to the agent. To send from a different address on a receiving domain, set `RESEND_FROM_ADDRESS`.

4. **Set environment variables** for Production (see `.env.example`):

   ```bash
   vercel env add APP_PASSWORD production         # password for the web app
   vercel env add OWNER_EMAIL production          # your email, the only sender the agent accepts
   vercel env add SHARE_KEY production            # optional: turns on the public share page (openssl rand -hex 24)
   ```

5. **Deploy.**

   ```bash
   npx eve deploy
   ```

6. **Connect the Resend webhook.** In Resend, add a webhook for the `email.received` event pointing at `https://<your-deployment>/eve/v1/resend`. Copy its signing secret, then:

   ```bash
   vercel env add RESEND_WEBHOOK_SECRET production
   npx eve deploy
   ```

AI Gateway needs no key on Vercel, because the deployment authenticates with OIDC. Vercel creates the Monday cron job from the schedule automatically. Check it under **Settings → Cron Jobs**.

## Develop locally

```bash
vercel env pull .env.local   # VERCEL_OIDC_TOKEN for AI Gateway
# DATABASE_URL goes in .env.development.local (see step 2 above)
npm run dev                  # Next.js and the eve dev server together
```

Locally, the app has no password unless you set `APP_PASSWORD`. The agent's API accepts localhost requests.

- **Capture:** open http://localhost:3000 and paste a social profile link or upload a business card photo.
- **Trigger the weekly digest now** (`eve dev` never fires schedules on its own):

  ```bash
  curl -X POST http://localhost:3000/eve/v1/dev/schedules/weekly_reconnect
  ```

  It skips the email when nobody is overdue. To test it, add a contact, then set its `last_contacted_at` back a few months, or use Chat to say "I last talked to Priya in March".

- **Email replies** need a public URL for the Resend webhook, so test them on a preview deployment.

## Public share page

Set `SHARE_KEY` and share `https://<your-app>/share?key=<SHARE_KEY>`, for example as a QR code on your badge or slides. Visitors can share a LinkedIn, X, or Bluesky link (the default), send a photo of their business card, or type their name and email. Conference badges and other photos are rejected. Without `SHARE_KEY`, or with a missing or wrong key, the page returns 404, or redirects to `REDIRECT_URL` if you set one (for example, your website). To revoke a link, change the key.

Submissions don't go through the eve agent. The agent can read and edit every contact, so a visitor's message or photo could carry a prompt injection. Instead:

- Photos go to an AI Gateway model call with no tools, which classifies the photo and only returns contact fields for a business card (`lib/share.ts`).
- Social links are parsed in code. Bluesky profiles are read from the public API; LinkedIn and X can't be read without signing in, so visitors add their name.
- New people are saved with a "Shared with you" label. If the email matches a contact you already have, nothing is overwritten; the submitted details are logged as an interaction on that contact for you to review.
- A hidden honeypot field drops simple bots. There's no rate limiting, so treat the key as the main protection and rotate it if it leaks.

## Facebook Messenger

Chat with the agent, or send it a business card photo, by messaging a Facebook Page. Optional: without credentials, `/eve/v1/messenger` answers 503 and the rest of the app is unaffected.

1. At developers.facebook.com, create an app with the **Engage with customers on Messenger from Meta** use case, and copy the **App Secret** (App settings → Basic).
2. Connect a Facebook Page to it and generate a **Page access token** (Messenger API settings).
3. Under **Configure webhooks**, set the callback URL to `https://<your-domain>/eve/v1/messenger`, choose any string as the **Verify token**, and subscribe to `messages`. Use your custom domain: per-deployment URLs are behind Deployment Protection.
4. Set `FACEBOOK_APP_SECRET`, `FACEBOOK_PAGE_ACCESS_TOKEN`, and `FACEBOOK_VERIFY_TOKEN` (the string from step 3), then deploy.
5. Message your Page. The agent replies "This is a private assistant." and logs `[messenger] Ignoring message from sender <id>`. Set `OWNER_MESSENGER_ID` to that ID and redeploy.

Only `OWNER_MESSENGER_ID` reaches the agent; anyone else gets the one-line reply. While your Meta app is in development mode, only people with a role on the app can message the Page anyway. Messenger only lets a Page reply within 24 hours of your last message, so the weekly and daily emails stay on email.

## Reminders

Ask in chat, Messenger, or email: "remind me to send Priya the deck next Tuesday" or "remind me Friday at 2pm to call Dana". Reminders are stored in Postgres with a due time in `OWNER_TIMEZONE`, and `agent/schedules/reminders.ts` emails everything that's due in one message. Reply "done" or "push it to Friday" to update them.

The schedule runs daily by default (`REMINDER_CRON`, 13:00 UTC), because Vercel's Hobby plan only runs cron jobs once a day, within the scheduled hour. On Pro, set `REMINDER_CRON="*/15 * * * *"` and timed reminders arrive within 15 minutes. Each run claims due reminders atomically, so overlapping runs never send one twice, and a failed email puts them back for the next run.

## Error reports on GitHub

When a tool fails unexpectedly (a database or network error, not "contact not found"), the agent loads the `report_error` skill, checks for an open duplicate, and opens an issue labeled `agent-error` on this repo.

- `agent/connections/github.ts` is an OpenAPI connection with a two-operation spec (list and create issues), not GitHub's whole API. The owner, repo, label, and state are filled in by code, so the agent can't touch other repos or issues.
- It uses a Vercel Connect GitHub App with app-scoped tokens, so it works in scheduled runs and emails where nobody is signed in. Set it up once from the project folder:

  ```bash
  vercel connect create github --name prm   # opens GitHub to install the app on this repo
  ```

  The connection expects connector `github/prm`; set `GITHUB_CONNECTOR` if yours differs. The target repo comes from the deployment's Git metadata, or `GITHUB_ISSUES_REPO` (`owner/name`).
- The repo is public, so the skill tells the agent to leave out all contact details and redact values from error messages.
- The agent can only report errors it sees in a tool result. If the model itself is unavailable, there's no agent turn to file anything.

## Skills and evals

The instructions for writing the weekly digest and the daily new-contacts email live in `agent/skills/` rather than `agent/instructions.md`. Only each skill's one-line description is in the system prompt; the agent loads the full instructions with `eve__skill` when a schedule asks for that email (the prompts in `agent/lib/digest-prompts.ts` name the skill). This keeps every other chat and email turn's prompt shorter.

`evals/skills/` checks that each schedule prompt loads its skill and mentions every contact, and that an ordinary question loads neither. Run them with:

```bash
npm run eval
```

The evals stub the database tools, and the agent only allows stubbed sessions under `eve dev` (`agent/channels/eve.ts`), so they run locally and need working AI Gateway credentials.

## Notes and limitations

- **One owner.** The inbound address is public, so `agent/channels/resend.ts` drops every email that isn't from `OWNER_EMAIL`. The web app is behind a single shared password (`lib/auth.ts`).
- **Replies may start a new thread.** The Resend adapter (v0.3.0) doesn't set its own `Message-ID` on outgoing mail, so your reply to a digest might not link back to the digest's session. The agent is built for this: every update goes through the database tools, and your email client quotes the digest in the reply.
- **Social links:** only Bluesky profiles can be read. For LinkedIn and X the agent stores the link and needs you to give the name.
- **Card photos go through the web page only.** The Resend adapter doesn't download inbound attachments yet.
- **Contacts are due** when the time since you last talked exceeds their reconnect cadence (60 days by default). Ask the agent to change a cadence ("check in with Dana every 30 days") or snooze someone.
- The default model is `anthropic/claude-sonnet-5.5`. Any vision-capable model on [AI Gateway](https://vercel.com/ai-gateway/models) works; change it in `agent/agent.ts`.

## Future channels

Chat SDK runs several adapters on one bot, so another channel is one more file in `agent/channels/`:

- **Discord:** eve's built-in Discord channel. Vercel Connect can supply the bot credentials. You could also post business card photos from your phone.
- **Telegram, Slack:** built-in eve channels.
- **WhatsApp, Messenger:** Chat SDK adapters exist, but both platforms only let a bot message you within 24 hours of your last message. A weekly push needs Meta-approved message templates.
- **SMS:** eve's Twilio channel. It costs money per message and US numbers must be registered for business texting (A2P 10DLC).
