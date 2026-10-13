import { createMemoryState } from "@chat-adapter/state-memory";
import { createPostgresState } from "@chat-adapter/state-pg";
import { createResendAdapter } from "@resend/chat-sdk-adapter";
import type { Message, Thread } from "chat";
import { chatSdkChannel } from "eve/channels/chat-sdk";

const THREAD_STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function ownerEmail(): string {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("OWNER_EMAIL is not set.");
  return email;
}

export const { bot, channel, send } = chatSdkChannel({
  userName: "PRM",
  adapters: {
    resend: createResendAdapter({
      // Must be on a domain Resend receives for (your default .resend.app address works),
      // otherwise replies never reach the webhook.
      fromAddress: process.env.RESEND_FROM_ADDRESS ?? "prm@example.resend.app",
      fromName: "PRM",
    }),
  },
  // Thread subscriptions and email threading headers must survive across function instances.
  state: process.env.DATABASE_URL || process.env.POSTGRES_URL ? createPostgresState() : createMemoryState(),
  streaming: false,
});

async function forwardOwnerEmail(thread: Thread, message: Message) {
  // The inbound address is public. Only the owner may read or change the database.
  if (message.author.userId.toLowerCase() !== ownerEmail()) return;

  await thread.subscribe();
  await send(message.text, {
    thread,
    auth: {
      authenticator: "resend",
      principalType: "user",
      principalId: ownerEmail(),
      attributes: {},
    },
    context: [`Today is ${new Date().toDateString()}. This message is an email from the owner.`],
    turnPolicy: "queue",
  });
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
