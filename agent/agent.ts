import { defineAgent } from "eve";
import { AGENT_MODEL } from "../lib/config";

export default defineAgent({
  // Routed through Vercel AI Gateway. Set AGENT_MODEL to switch; it must accept images.
  model: AGENT_MODEL,
  // The agent only needs its contact tools: no sandbox, shell, or web access.
  defaultTools: false,
  limits: {
    maxTokenCostUsdPerSession: 2,
  },
});
