import { z } from "zod";

const optionalText = z.string().trim().optional();

/** Fields the model can fill in from a badge, a business card, or an email reply. */
export const contactFieldsSchema = z.object({
  name: z.string().trim().min(1).describe("Full name as printed"),
  title: optionalText.describe("Job title"),
  company: optionalText.describe("Company or organization"),
  email: z.string().trim().email().optional(),
  phone: optionalText.describe("Phone number, as printed"),
  linkedin: optionalText.describe("LinkedIn profile URL"),
  x: optionalText.describe("X (Twitter) profile URL"),
  bluesky: optionalText.describe("Bluesky profile URL"),
  website: optionalText,
  metAt: optionalText.describe('Where you met, e.g. "Ship London 2026"'),
  notes: optionalText.describe("Anything else worth remembering"),
  reconnectEveryDays: z
    .number()
    .int()
    .min(7)
    .max(365)
    .optional()
    .describe("How often to suggest reconnecting. Defaults to 90 days."),
});
