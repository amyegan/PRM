-- Contacts captured from badges and business cards.
create table if not exists contacts (
  id                    bigserial primary key,
  name                  text not null,
  title                 text,
  company               text,
  email                 text,
  phone                 text,
  linkedin              text,
  website               text,
  met_at                text,          -- event or place, e.g. "Ship London 2026"
  notes                 text,
  reconnect_every_days  integer not null default 60,
  last_contacted_at     timestamptz,
  snoozed_until         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists contacts_email_key on contacts (lower(email)) where email is not null;
create index if not exists contacts_name_idx on contacts (lower(name));

-- Every touchpoint: the first meeting, emails, coffees, replies to the weekly digest.
create table if not exists interactions (
  id           bigserial primary key,
  contact_id   bigint not null references contacts(id) on delete cascade,
  occurred_at  timestamptz not null default now(),
  summary      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists interactions_contact_idx on interactions (contact_id, occurred_at desc);

-- Added later: social profiles and where a contact came from. Safe to re-run.
alter table contacts add column if not exists x text;
alter table contacts add column if not exists bluesky text;
alter table contacts add column if not exists source text not null default 'capture'; -- 'capture' | 'shared'

-- New contacts default to reconnecting every 60 days (was 90). Existing contacts keep their cadence.
alter table contacts alter column reconnect_every_days set default 60;
