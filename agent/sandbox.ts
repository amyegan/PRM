import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";
import { VercelSandbox } from "eve/sandbox/vercel";

// The agent never runs code; the sandbox only holds uploaded photos for the session.
// Vercel Sandbox in production, a pure-JavaScript filesystem everywhere else (no Docker needed).
export const environment = process.env.VERCEL
  ? VercelSandbox.environment()
  : JustBashSandbox.environment();

export default defineSandbox(() => environment.open());
