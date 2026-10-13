import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthConfigured, isValidSession, SESSION_COOKIE } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const routerHost = process.env.VERCEL_URL;
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.__VERCEL_DEV_RUNNING === "1" && routerHost && forwardedHost !== routerHost) {
    const target = request.nextUrl.clone();
    target.protocol = "http:";
    target.host = routerHost;
    return NextResponse.redirect(target);
  }

  // Without APP_PASSWORD the app is open in development and closed in production.
  const gated = isAuthConfigured() || process.env.NODE_ENV === "production";
  if (gated && !(await isValidSession(request.cookies.get(SESSION_COOKIE)?.value))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // The agent's own routes (/eve/*, workflow webhooks) enforce their own auth; the Resend
  // webhook at /eve/v1/resend must stay reachable without a cookie.
  matcher: ["/((?!login|eve/|\\.well-known/|_next/|icon|apple-icon|favicon).*)"],
};
