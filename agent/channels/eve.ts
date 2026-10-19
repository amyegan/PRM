import { type AuthFn, localDev, vercelOidc } from "eve/channels/auth";
import { defaultEveAuth, eveChannel } from "eve/channels/eve";
import { isValidSession, readCookie, SESSION_COOKIE } from "../../lib/auth";
import { todayContext } from "../../lib/config";

/** Accepts browser requests carrying the cookie set by the /login page. */
function ownerSession(): AuthFn<Request> {
  return async (request) => {
    const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
    if (!(await isValidSession(token))) return null;
    return {
      authenticator: "app",
      principalId: "owner",
      principalType: "user",
      attributes: {},
    };
  };
}

/**
 * `localDev()`, plus permission for evals to stub tools. localDev only matches under `eve dev`,
 * so production never accepts stubbed sessions.
 */
function localDevWithEvalStubs(): AuthFn<Request> {
  const authenticate = localDev();
  return async (request) => {
    const caller = await authenticate(request);
    return caller ? { ...caller, allowToolStubs: true } : null;
  };
}

export default eveChannel({
  auth: [
    ownerSession(),
    // Lets the eve TUI and your other Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and `eve eval`; ignored in production.
    localDevWithEvalStubs(),
  ],
  onMessage(ctx) {
    return {
      auth: defaultEveAuth(ctx),
      context: [todayContext()],
    };
  },
});
