import pg from "pg";

// One pool per runtime instance. Both the Next.js app and the eve agent import this module.
const globalForPool = globalThis as typeof globalThis & { __prmPool?: pg.Pool };

function pool(): pg.Pool {
  if (!globalForPool.__prmPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Add Neon from the Vercel Marketplace and run `vercel env pull`.");
    }
    globalForPool.__prmPool = new pg.Pool({ connectionString, max: 5 });
  }
  return globalForPool.__prmPool;
}

export type Contact = {
  id: number;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  x: string | null;
  bluesky: string | null;
  website: string | null;
  metAt: string | null;
  notes: string | null;
  reconnectEveryDays: number;
  lastContactedAt: string | null;
  snoozedUntil: string | null;
  source: "capture" | "shared";
  createdAt: string;
};

export type ContactFields = Partial<
  Pick<
    Contact,
    | "name"
    | "title"
    | "company"
    | "email"
    | "phone"
    | "linkedin"
    | "x"
    | "bluesky"
    | "website"
    | "metAt"
    | "notes"
    | "reconnectEveryDays"
    | "snoozedUntil"
  >
>;

export type Interaction = { id: number; occurredAt: string; summary: string };

const COLUMNS: Record<keyof ContactFields, string> = {
  name: "name",
  title: "title",
  company: "company",
  email: "email",
  phone: "phone",
  linkedin: "linkedin",
  x: "x",
  bluesky: "bluesky",
  website: "website",
  metAt: "met_at",
  notes: "notes",
  reconnectEveryDays: "reconnect_every_days",
  snoozedUntil: "snoozed_until",
};

const iso = (value: Date | null) => (value ? value.toISOString() : null);

function toContact(row: Record<string, any>): Contact {
  return {
    id: Number(row.id),
    name: row.name,
    title: row.title,
    company: row.company,
    email: row.email,
    phone: row.phone,
    linkedin: row.linkedin,
    x: row.x,
    bluesky: row.bluesky,
    website: row.website,
    metAt: row.met_at,
    notes: row.notes,
    reconnectEveryDays: row.reconnect_every_days,
    lastContactedAt: iso(row.last_contacted_at),
    snoozedUntil: iso(row.snoozed_until),
    source: row.source,
    createdAt: iso(row.created_at)!,
  };
}

/** Inserts a contact, or merges into the existing one when the email already exists. */
export async function saveContact(
  fields: ContactFields & { name: string },
): Promise<{ contact: Contact; created: boolean }> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined && v !== "") as [
    keyof ContactFields,
    unknown,
  ][];
  const columns = entries.map(([key]) => COLUMNS[key]);
  const values = entries.map(([, value]) => value);
  const updates = columns
    .filter((column) => column !== "email")
    .map((column) => `${column} = coalesce(excluded.${column}, contacts.${column})`);

  const { rows } = await pool().query(
    `insert into contacts (${columns.join(", ")})
     values (${values.map((_, i) => `$${i + 1}`).join(", ")})
     on conflict (lower(email)) where email is not null
     do update set ${[...updates, "updated_at = now()"].join(", ")}
     returning *, (xmax = 0) as inserted`,
    values,
  );
  return { contact: toContact(rows[0]), created: rows[0].inserted };
}

export async function updateContact(id: number, fields: ContactFields): Promise<Contact | null> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined) as [
    keyof ContactFields,
    unknown,
  ][];
  if (entries.length === 0) return getContact(id).then((r) => r?.contact ?? null);

  const sets = entries.map(([key], i) => `${COLUMNS[key]} = $${i + 2}`);
  const { rows } = await pool().query(
    `update contacts set ${[...sets, "updated_at = now()"].join(", ")} where id = $1 returning *`,
    [id, ...entries.map(([, value]) => (value === "" ? null : value))],
  );
  return rows[0] ? toContact(rows[0]) : null;
}

export async function findContacts(query: string, limit = 10): Promise<Contact[]> {
  const { rows } = await pool().query(
    `select * from contacts
     where name ilike $1 or company ilike $1 or email ilike $1 or met_at ilike $1
        or linkedin ilike $1 or x ilike $1 or bluesky ilike $1
     order by lower(name) = lower($2) desc, updated_at desc
     limit $3`,
    [`%${query}%`, query, limit],
  );
  return rows.map(toContact);
}

export async function getContact(
  id: number,
): Promise<{ contact: Contact; interactions: Interaction[] } | null> {
  const [contact, interactions] = await Promise.all([
    pool().query(`select * from contacts where id = $1`, [id]),
    pool().query(
      `select id, occurred_at, summary from interactions
       where contact_id = $1 order by occurred_at desc limit 10`,
      [id],
    ),
  ]);
  if (!contact.rows[0]) return null;
  return {
    contact: toContact(contact.rows[0]),
    interactions: interactions.rows.map((row) => ({
      id: Number(row.id),
      occurredAt: iso(row.occurred_at)!,
      summary: row.summary,
    })),
  };
}

/** Records a touchpoint and moves last_contacted_at forward (never backward). */
export async function logInteraction(
  contactId: number,
  summary: string,
  occurredAt?: string,
): Promise<Contact | null> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const { rows: inserted } = await client.query(
      `insert into interactions (contact_id, summary, occurred_at)
       values ($1, $2, coalesce($3::timestamptz, now()))
       returning occurred_at`,
      [contactId, summary, occurredAt ?? null],
    );
    const { rows } = await client.query(
      `update contacts
       set last_contacted_at = greatest(coalesce(last_contacted_at, '-infinity'), $2),
           snoozed_until = null,
           updated_at = now()
       where id = $1 returning *`,
      [contactId, inserted[0].occurred_at],
    );
    await client.query("commit");
    return rows[0] ? toContact(rows[0]) : null;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Saves contact info someone submitted on the public share page. Untrusted input never
 * overwrites an existing contact: if the email is already saved, the submission is recorded
 * as an interaction on that contact for the owner to review instead.
 */
export async function addSharedContact(
  fields: ContactFields & { name: string },
  message?: string,
): Promise<{ contact: Contact; created: boolean }> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined && v !== "") as [
    keyof ContactFields,
    unknown,
  ][];
  const columns = [...entries.map(([key]) => COLUMNS[key]), "source"];
  const values = [...entries.map(([, value]) => value), "shared"];

  const { rows } = await pool().query(
    `insert into contacts (${columns.join(", ")})
     values (${values.map((_, i) => `$${i + 1}`).join(", ")})
     on conflict (lower(email)) where email is not null do nothing
     returning *`,
    values,
  );
  const note = message ? ` Their note: "${message}"` : "";

  if (rows[0]) {
    const contact = toContact(rows[0]);
    await logInteraction(contact.id, `Shared their contact info via your public page.${note}`);
    return { contact, created: true };
  }

  const existing = await pool().query(`select * from contacts where lower(email) = lower($1)`, [fields.email]);
  const contact = toContact(existing.rows[0]);
  const details = entries.map(([key, value]) => `${key}: ${value}`).join(", ");
  await logInteraction(contact.id, `Shared their contact info again via your public page (${details}).${note}`);
  return { contact, created: false };
}

export type ReconnectCandidate = Contact & {
  daysSinceContact: number;
  lastInteraction: string | null;
};

/** Contacts whose reconnect cadence has elapsed, most overdue first. */
export async function listReconnectCandidates(limit = 5): Promise<ReconnectCandidate[]> {
  const { rows } = await pool().query(
    `select c.*,
            floor(extract(epoch from now() - coalesce(c.last_contacted_at, c.created_at)) / 86400)::int
              as days_since_contact,
            (select summary from interactions i where i.contact_id = c.id
             order by occurred_at desc limit 1) as last_interaction
     from contacts c
     where (c.snoozed_until is null or c.snoozed_until < now())
       and coalesce(c.last_contacted_at, c.created_at) < now() - make_interval(days => c.reconnect_every_days)
     order by extract(epoch from now() - coalesce(c.last_contacted_at, c.created_at)) / 86400
              - c.reconnect_every_days desc
     limit $1`,
    [limit],
  );
  return rows.map((row) => ({
    ...toContact(row),
    daysSinceContact: row.days_since_contact,
    lastInteraction: row.last_interaction,
  }));
}

export async function listContacts(): Promise<Contact[]> {
  const { rows } = await pool().query(`select * from contacts order by created_at desc limit 500`);
  return rows.map(toContact);
}
