// Social profile links: normalize LinkedIn, X, and Bluesky URLs, and read public Bluesky profiles.
// LinkedIn and X don't expose profiles without signing in, so for those we only keep the link.

export type SocialPlatform = "linkedin" | "x" | "bluesky";

export type SocialProfile = {
  platform: SocialPlatform;
  url: string;
  handle: string;
  /** Present only when the profile could be read (Bluesky). */
  displayName?: string;
  description?: string;
};

// x.com paths that aren't profiles.
const X_RESERVED = new Set(["home", "explore", "search", "i", "settings", "notifications", "messages", "intent", "share", "login"]);

export function parseSocialUrl(input: string): Omit<SocialProfile, "displayName" | "description"> | null {
  const raw = input.trim();

  // Bare Bluesky handle, e.g. "@priya.bsky.social".
  const bareHandle = raw.replace(/^@/, "");
  if (!raw.includes("/") && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(bareHandle)) {
    return { platform: "bluesky", handle: bareHandle, url: `https://bsky.app/profile/${bareHandle}` };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  const [first, second] = url.pathname.split("/").filter(Boolean);

  if (host === "linkedin.com" && first === "in" && second) {
    return { platform: "linkedin", handle: second, url: `https://www.linkedin.com/in/${second}` };
  }
  if ((host === "x.com" || host === "twitter.com") && first && /^\w{1,15}$/.test(first) && !X_RESERVED.has(first.toLowerCase())) {
    return { platform: "x", handle: first, url: `https://x.com/${first}` };
  }
  if (host === "bsky.app" && first === "profile" && second) {
    return { platform: "bluesky", handle: second, url: `https://bsky.app/profile/${second}` };
  }
  return null;
}

/** Parses the link and, for Bluesky, fetches the public profile's name and bio. */
export async function lookupSocialProfile(input: string): Promise<SocialProfile | null> {
  const parsed = parseSocialUrl(input);
  if (!parsed || parsed.platform !== "bluesky") return parsed;

  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(parsed.handle)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return parsed;
    const profile = (await response.json()) as { handle?: string; displayName?: string; description?: string };
    return {
      ...parsed,
      handle: profile.handle ?? parsed.handle,
      displayName: profile.displayName?.trim() || undefined,
      description: profile.description?.trim().slice(0, 500) || undefined,
    };
  } catch {
    return parsed;
  }
}
