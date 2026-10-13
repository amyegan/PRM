# PRM: a personal relationship manager agent

Snap a photo of a conference badge or business card, and an [eve](https://eve.dev) agent reads it and saves the contact. Every Monday the agent emails you who you're overdue to reconnect with. Reply in plain language ("Had coffee with Priya on Tuesday, she's moving to Stripe") and it updates your contacts.

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
| Contact tools: save, find, get, update, log interaction, list overdue | `agent/tools/` |
| Email channel (Chat SDK + Resend adapter) | `agent/channels/resend.ts` |
| Web channel with password auth | `agent/channels/eve.ts` |
| Weekly digest | `agent/schedules/weekly_reconnect.ts` |
| Database queries, shared by the agent and the pages | `lib/db.ts`, `db/schema.sql` |
| Capture page, contacts list, chat | `app/page.tsx`, `app/contacts/`, `app/s/` |

The agent has no shell, file, or web tools (`defaultTools: false`). It can only read and write your contacts.

## Deploy

You need a Vercel account and a [Resend](https://resend.com) account. Both have free tiers.

1. **Create the Vercel project.**

   ```bash
   npm install
   npx eve link
   ```

2. **Add a database.** In the Vercel dashboard, open the project's **Storage** tab, add **Neon** from the Marketplace, and connect it to the project. This sets `DATABASE_URL`. Then create the tables:

   ```bash
   vercel env pull .env.local
   npm run db:migrate
   ```

3. **Set up Resend.**
   - Create an API key.
   - Under **Receiving**, copy your inbound address (`<something>.resend.app`). You'll send from an address on that domain too, such as `prm@<something>.resend.app`, so your replies come back to the agent.

4. **Set environment variables** for Production (see `.env.example`):

   ```bash
   vercel env add APP_PASSWORD production         # password for the web app
   vercel env add OWNER_EMAIL production          # your email, the only sender the agent accepts
   vercel env add RESEND_API_KEY production
   vercel env add RESEND_FROM_ADDRESS production  # prm@<something>.resend.app
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
vercel env pull .env.local   # DATABASE_URL, plus a VERCEL_OIDC_TOKEN for AI Gateway
npm run dev                  # Next.js and the eve dev server together
```

Locally, the app has no password unless you set `APP_PASSWORD`. The agent's API accepts localhost requests.

- **Capture:** open http://localhost:3000 and upload a badge photo.
- **Trigger the weekly digest now** (`eve dev` never fires schedules on its own):

  ```bash
  curl -X POST http://localhost:3000/eve/v1/dev/schedules/weekly_reconnect
  ```

  It skips the email when nobody is overdue. To test it, add a contact, then set its `last_contacted_at` back a few months, or use Chat to say "I last talked to Priya in March".

- **Email replies** need a public URL for the Resend webhook, so test them on a preview deployment.

## Notes and limitations

- **One owner.** The inbound address is public, so `agent/channels/resend.ts` drops every email that isn't from `OWNER_EMAIL`. The web app is behind a single shared password (`lib/auth.ts`).
- **Replies may start a new thread.** The Resend adapter (v0.3.0) doesn't set its own `Message-ID` on outgoing mail, so your reply to a digest might not link back to the digest's session. The agent is built for this: every update goes through the database tools, and your email client quotes the digest in the reply.
- **Badge photos go through the web page only.** The Resend adapter doesn't download inbound attachments yet.
- **Contacts are due** when the time since you last talked exceeds their reconnect cadence (90 days by default). Ask the agent to change a cadence ("check in with Dana every 30 days") or snooze someone.
- The default model is `anthropic/claude-sonnet-5.5`. Any vision-capable model on [AI Gateway](https://vercel.com/ai-gateway/models) works; change it in `agent/agent.ts`.

## Future channels

Chat SDK runs several adapters on one bot, so another channel is one more file in `agent/channels/`:

- **Discord:** eve's built-in Discord channel. Vercel Connect can supply the bot credentials. You could also post badge photos from your phone.
- **Telegram, Slack:** built-in eve channels.
- **WhatsApp, Messenger:** Chat SDK adapters exist, but both platforms only let a bot message you within 24 hours of your last message. A weekly push needs Meta-approved message templates.
- **SMS:** eve's Twilio channel. It costs money per message and US numbers must be registered for business texting (A2P 10DLC).
