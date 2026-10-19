import { z } from "zod";

export const reminderDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const reminderTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM")
  .describe("Time of day in 24-hour HH:MM, owner's time zone. Omit for a date-only reminder (09:00).");
