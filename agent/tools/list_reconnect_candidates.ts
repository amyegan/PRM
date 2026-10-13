import { defineTool } from "eve/tools";
import { z } from "zod";
import { listReconnectCandidates } from "../../lib/db";

export default defineTool({
  description:
    "List contacts you're overdue to reconnect with, most overdue first, with the last thing you talked about.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(5) }),
  async execute({ limit }) {
    return { candidates: await listReconnectCandidates(limit) };
  },
});
