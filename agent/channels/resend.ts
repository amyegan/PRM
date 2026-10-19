import { createMemoryState } from "@chat-adapter/state-memory";
import { createPostgresState } from "@chat-adapter/state-pg";
import { createResendAdapter } from "@resend/chat-sdk-adapter";
import type { Message, Thread } from "chat";
import { chatSdkChannel } from "eve/channels/chat-sdk";
import { APP_NAME, todayContext } from "../../lib/config";
import { databaseUrl } from "../../lib/database-url";

const THREAD_STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function ownerEmail(): string {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("OWNER_EMAIL is not set.");
  return email;
}

/**
 * RESEND_EMAIL_DOMAIN comes from the Resend integration on Vercel. The domain must also be set
 * up for receiving in Resend, otherwise replies never reach the webhook.
 */
function fromAddress(): string {
  if (process.env.RESEND_FROM_ADDRESS) return process.env.RESEND_FROM_ADDRESS;
  const domain = process.env.RESEND_EMAIL_DOMAIN?.trim().replace(/^@/, "");
  return `prm@${domain || "example.resend.app"}`;
}

export const { bot, channel, send } = chatSdkChannel({
  userName: APP_NAME,
  adapters: {
    resend: createResendAdapter({
      fromAddress: fromAddress(),
      fromName: APP_NAME,
    }),
  },
  // Thread subscriptions and email threading headers must survive across function instances.
  state: databaseUrl() ? createPostgresState({ url: databaseUrl() }) : createMemoryState(),
  streaming: false,
});

async function forwardOwnerEmail(thread: Thread, message: Message) {
  // The inbound address is public. Only the owner may read or change the database.
  const sender = message.author.userId.toLowerCase();
  if (sender !== ownerEmail()) {
    console.warn(`[resend] Ignoring email from ${redact(sender)}: not OWNER_EMAIL (${redact(ownerEmail())}).`);
    return;
  }
  if (!message.text.trim()) {
    console.warn(`[resend] Ignoring email ${message.id}: no text or HTML body.`);
    return;
  }

  await thread.subscribe();
  await send(message.text, {
    thread,
    auth: {
      authenticator: "resend",
      principalType: "user",
      principalId: ownerEmail(),
      attributes: {},
    },
    context: [`${todayContext()} This message is an email from the owner.`],
    turnPolicy: "queue",
  });
}

/** "amy.egan@example.com" → "am…n@example.com (8)", enough to spot a mismatch in logs. */
function redact(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}…${local.slice(-1)}@${domain} (${local.length})`;
}

bot.onNewMention(forwardOwnerEmail);
bot.onSubscribedMessage(forwardOwnerEmail);

/**
 * Starts a new email thread to the owner with the given subject and returns its thread ID.
 * The Resend adapter needs a full `resend:<address>:<hash>` ID, which `openDM` creates.
 */
export async function openOwnerThread(subject: string): Promise<string> {
  await bot.initialize();
  const threadId = await bot.getAdapter("resend").openDM(ownerEmail());
  // The adapter reads the subject from state; without it the email goes out as "New message".
  await bot.getState().set(`resend:thread-subject:${threadId}`, subject, THREAD_STATE_TTL_MS);
  return threadId;
}

export default channel;
