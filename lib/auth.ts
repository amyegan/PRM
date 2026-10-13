// Single-owner password gate shared by the Next.js pages and the eve HTTP channel.
// The cookie holds an HMAC of the password, so changing APP_PASSWORD signs everyone out.

export const SESSION_COOKIE = "prm_session";

export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export async function sessionToken(password = process.env.APP_PASSWORD ?? ""): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("prm-session-v1"));
  return Buffer.from(signature).toString("base64url");
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token || !isAuthConfigured()) return false;
  const expected = await sessionToken();
  return token.length === expected.length && timingSafeEqual(token, expected);
}

export function readCookie(header: string | null, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function timingSafeEqual(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
