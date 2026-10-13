---
description: Use when the owner asks what to say to a contact, how to reach out or follow up, or for conversation ideas, and when writing the weekly or daily email.
---

# Conversation starters

Suggest specific, natural ways for the owner to open a conversation with a contact. A good starter shows the owner remembers something real about the person.

## Gather context

1. Find the contact (`find_contacts`), then call `get_contact` for their details and recent interactions. In the scheduled emails you're already given each contact's key facts; call `get_contact` only when a contact's last interaction is missing or too thin to build on.
2. If they have a Bluesky profile, you can call `lookup_social_profile` for their current bio. LinkedIn and X can't be read, so don't imply you checked them.

## Write the starters

Base every starter on something stored, in this order of preference:

1. **An open thread from the last interaction:** a question they asked, an intro they wanted, or a project they mentioned. "Did the Turborepo migration land?"
2. **Something you can offer:** an intro, an article, or an event that fits what they care about.
3. **Where you met:** "Are you heading back to Ship London next year?"
4. **Their role or company:** use only when there's nothing better.

Rules:

- **Never invent facts.** No made-up news, promotions, or shared memories. If you only know their name and where you met, say the suggestion is light on context.
- Keep each starter to one or two sentences, in the owner's voice, ready to paste into an email or DM.
- Match the gap: after a long silence, acknowledge it lightly ("It's been a while"). Don't apologize at length.
- No sales pitches, flattery, or "just checking in" with nothing else.
- You draft; the owner sends. Never say a message was sent.

## Format

- **In chat:** give 2–3 options with a few words on why each fits ("picks up your Turborepo conversation"), then offer to draft a full message.
- **In the weekly or daily email:** one starter per person, in quotes, at the end of that person's line.
