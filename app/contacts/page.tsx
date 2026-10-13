import { SiteNav } from "@/app/_components/site-nav";
import { type Contact, listContacts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await listContacts();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-4 py-6">
      <SiteNav current="/contacts" />
      <header className="flex flex-col gap-1">
        <h1 className="font-medium text-3xl tracking-tight">Contacts</h1>
        <p className="text-muted-foreground text-sm">
          {contacts.length === 1 ? "1 contact" : `${contacts.length} contacts`}. Reply to the weekly
          email or use Chat to log conversations and update details.
        </p>
      </header>
      {contacts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No contacts yet. Capture your first badge.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {contacts.map((contact) => (
            <ContactRow contact={contact} key={contact.id} />
          ))}
        </ul>
      )}
    </main>
  );
}

function ContactRow({ contact }: { readonly contact: Contact }) {
  const role = [contact.title, contact.company].filter(Boolean).join(" · ");
  const reach = [contact.email, contact.phone].filter(Boolean).join(" · ");
  const socials = [
    contact.linkedin && { label: "LinkedIn", url: contact.linkedin },
    contact.x && { label: "X", url: contact.x },
    contact.bluesky && { label: "Bluesky", url: contact.bluesky },
  ].filter((link): link is { label: string; url: string } => Boolean(link));

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">
          {contact.name}
          {contact.source === "shared" ? (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-normal text-muted-foreground text-xs">
              Shared with you
            </span>
          ) : null}
        </p>
        {role ? <p className="text-muted-foreground text-sm">{role}</p> : null}
        {reach ? <p className="break-all text-muted-foreground text-sm">{reach}</p> : null}
        {socials.length > 0 ? (
          <p className="flex gap-3 text-sm">
            {socials.map((link) => (
              <a
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                href={/^https?:\/\//.test(link.url) ? link.url : `https://${link.url}`}
                key={link.label}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </p>
        ) : null}
      </div>
      <div className="text-right text-muted-foreground text-sm">
        {contact.metAt ? <p>Met at {contact.metAt}</p> : null}
        <p>Last talked {formatDate(contact.lastContactedAt)}</p>
      </div>
    </li>
  );
}

function formatDate(value: string | null) {
  if (!value) return "never";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
