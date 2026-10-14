"use server";

import { z } from "zod";
import { addSharedContact, type ContactFields } from "@/lib/db";
import { extractContactFromPhoto, isValidShareKey, type PhotoExtraction } from "@/lib/share";
import { lookupSocialProfile } from "@/lib/social";

const PHOTO_ERRORS: Record<Extract<PhotoExtraction, { ok: false }>["reason"], string> = {
  badge: "That looks like a conference badge. Please use a business card, or share a social profile instead.",
  not_a_card: "That doesn't look like a business card. Try another photo, or share a social profile instead.",
  no_name: "We couldn't read a name on that card. Try a clearer photo, or type your details instead.",
};

export type ShareResult = { ok: true; name: string } | { ok: false; error: string };

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

const submissionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("photo"), photo: z.string().max(6_000_000) }),
  z.object({ mode: z.literal("social"), socialUrl: z.string().trim().min(1).max(500), name: text(200) }),
  z.object({
    mode: z.literal("manual"),
    name: z.string().trim().min(1, "Enter your name.").max(200),
    email: z.string().trim().email("Enter a valid email address.").max(320),
    company: text(200),
  }),
]);

const sharedSchema = z.object({
  key: z.string(),
  // Hidden field that people never see; bots that fill every input get dropped.
  fax: z.string().max(0).optional(),
  metAt: text(200),
  message: text(1000),
});

export async function submitSharedContact(input: unknown): Promise<ShareResult> {
  const shared = sharedSchema.safeParse(input);
  if (!shared.success || !isValidShareKey(shared.data.key)) {
    return { ok: false, error: "This link isn't valid anymore. Ask for a new one." };
  }
  const submission = submissionSchema.safeParse(input);
  if (!submission.success) {
    return { ok: false, error: submission.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { metAt, message } = shared.data;
  const data = submission.data;
  let fields: (ContactFields & { name: string }) | null = null;

  try {
    if (data.mode === "photo") {
      const extraction = await extractContactFromPhoto(data.photo);
      if (!extraction.ok) return { ok: false, error: PHOTO_ERRORS[extraction.reason] };
      fields = extraction.fields;
    } else if (data.mode === "social") {
      const profile = await lookupSocialProfile(data.socialUrl);
      if (!profile) return { ok: false, error: "Enter a LinkedIn, X, or Bluesky profile link." };
      const name = data.name ?? profile.displayName;
      if (!name) return { ok: false, error: "Add your name so we know who you are." };
      fields = { name, [profile.platform]: profile.url };
    } else {
      fields = { name: data.name, email: data.email, company: data.company };
    }

    await addSharedContact({ ...fields, metAt: metAt ?? fields.metAt }, message);
    // Echo what they sent, never the stored record: their email may match an existing contact.
    return { ok: true, name: fields.name };
  } catch (error) {
    console.error("share submission failed", error);
    return { ok: false, error: "Something went wrong saving your details. Please try again." };
  }
}
