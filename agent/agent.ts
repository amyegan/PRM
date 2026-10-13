import { defineAgent } from "eve";

export default defineAgent({
  // Routed through Vercel AI Gateway. Any vision-capable model works for reading badges.
  model: "anthropic/claude-sonnet-5.5",
  // The agent only needs its contact tools: no sandbox, shell, or web access.
  defaultTools: false,
  limits: {
    maxTokenCostUsdPerSession: 2,
  },
});
