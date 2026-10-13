import { type AuthFn, localDev, vercelOidc } from "eve/channels/auth";
import { defaultEveAuth, eveChannel } from "eve/channels/eve";
import { isValidSession, readCookie, SESSION_COOKIE } from "../../lib/auth";

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

export default eveChannel({
  auth: [
    ownerSession(),
    // Lets the eve TUI and your other Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev`; ignored in production.
    localDev(),
  ],
  onMessage(ctx) {
    return {
      auth: defaultEveAuth(ctx),
      context: [`Today is ${new Date().toDateString()}.`],
    };
  },
});
