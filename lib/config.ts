// Settings a fork is likely to change. Secrets and credentials are read where they're used;
// see .env.example for the full list.

/** Shown in the web app, as the email sender name, and as the chat bot's name. NEXT_PUBLIC_ so client components can read it. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "PRM";

/** AI Gateway model ID for the agent and the public share page's card reader. Must accept images. */
export const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-5.5";
