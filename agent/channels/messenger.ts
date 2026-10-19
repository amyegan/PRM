import { createMessengerAdapter } from "@chat-adapter/messenger";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createPostgresState } from "@chat-adapter/state-pg";
import type { UserContent } from "ai";
import type { Message, Thread } from "chat";
import { defineChannel, GET, POST } from "eve/channels";
import { chatSdkChannel } from "eve/channels/chat-sdk";
import { APP_NAME, todayContext } from "../../lib/config";
import { databaseUrl } from "../../lib/database-url";

// Facebook Messenger: chat with the agent by messaging your Facebook Page.
// Credentials come from FACEBOOK_APP_SECRET, FACEBOOK_PAGE_ACCESS_TOKEN, and FACEBOOK_VERIFY_TOKEN.
// Without them the route answers 503 instead, since the adapter refuses to start.

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const configured = Boolean(
  process.env.FACEBOOK_APP_SECRET && process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_VERIFY_TOKEN,
);

/** Your page-scoped Messenger ID. Anyone can message a Page, so only this sender reaches the agent. */
function ownerId(): string | undefined {
  return process.env.OWNER_MESSENGER_ID?.trim() || undefined;
}

function createMessengerChannel() {
  const { bot, channel, send } = chatSdkChannel({
    userName: APP_NAME,
    adapters: { messenger: createMessengerAdapter() },
    state: databaseUrl()
      ? createPostgresState({ url: databaseUrl(), keyPrefix: "chat-sdk-messenger" })
      : createMemoryState(),
    // Messenger can't edit sent messages, so post each reply once.
    streaming: false,
  });

  bot.onDirectMessage(async (thread: Thread, message: Message) => {
    const sender = message.author.userId;
    if (sender !== ownerId()) {
      // Log the ID so the owner can find theirs: message the Page once, then copy it from the logs.
      console.warn(`[messenger] Ignoring message from sender ${sender}: not OWNER_MESSENGER_ID.`);
      await thread.post("This is a private assistant.");
      return;
    }

    await send(await toUserContent(message), {
      thread,
      auth: {
        authenticator: "messenger",
        principalType: "user",
        principalId: `messenger:${sender}`,
        attributes: {},
      },
      context: [
        `${todayContext()} This message is from the owner on Facebook Messenger. ` +
          "Keep replies short and plain: Messenger doesn't render Markdown.",
      ],
      turnPolicy: "queue",
    });
  });

  return channel;
}

/**
 * The adapter can only download Messenger photos while the webhook is running, so fetch them
 * here and hand the bytes to the agent. This is what lets you send a business card photo.
 */
async function toUserContent(message: Message): Promise<string | UserContent> {
  const images = (message.attachments ?? []).filter(
    (a) => a.fetchData && (a.mimeType?.startsWith("image/") || a.type === "image"),
  );
  if (images.length === 0) return message.text;

  const parts: UserContent = [
    { type: "text", text: message.text || "Capture the contact on this business card." },
  ];
  for (const image of images) {
    try {
      const data = await image.fetchData!();
      const bytes = Buffer.isBuffer(data) ? data : Buffer.from(new Uint8Array(data));
      if (bytes.length > MAX_PHOTO_BYTES) {
        parts.push({ type: "text", text: "(A photo was too large to read; ask for a smaller one.)" });
        continue;
      }
      parts.push({
        type: "file",
        mediaType: image.mimeType?.startsWith("image/") ? image.mimeType : "image/jpeg",
        data: `data:${image.mimeType ?? "image/jpeg"};base64,${bytes.toString("base64")}`,
        filename: image.name ?? "photo.jpg",
      });
    } catch (error) {
      console.warn("[messenger] Couldn't download a photo:", error);
      parts.push({ type: "text", text: "(A photo couldn't be downloaded; ask the owner to resend it.)" });
    }
  }
  return parts;
}

const ROUTE = "/eve/v1/messenger";

function notConfigured() {
  const reply = async () =>
    new Response("Messenger isn't configured. Set FACEBOOK_APP_SECRET, FACEBOOK_PAGE_ACCESS_TOKEN, and FACEBOOK_VERIFY_TOKEN.", {
      status: 503,
    });
  return defineChannel({ routes: [GET(ROUTE, reply), POST(ROUTE, reply)] });
}

export default configured ? createMessengerChannel() : notConfigured();
