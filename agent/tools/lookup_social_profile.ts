import { defineTool } from "eve/tools";
import { z } from "zod";
import { lookupSocialProfile } from "../../lib/social";

export default defineTool({
  description:
    "Normalize a LinkedIn, X, or Bluesky profile link (or a Bluesky handle). For Bluesky it also returns " +
    "the public display name and bio. LinkedIn and X profiles can't be read, so only the link and handle come back.",
  inputSchema: z.object({ url: z.string().trim().min(1) }),
  label: { start: ({ url }) => `Look up ${url}` },
  async execute({ url }) {
    return (
      (await lookupSocialProfile(url)) ?? {
        error: "That isn't a LinkedIn (linkedin.com/in/…), X, or Bluesky profile link.",
      }
    );
  },
});
