import type { Contact, ReconnectCandidate } from "../../lib/db";

const base: Contact = {
  id: 0,
  name: "",
  title: null,
  company: null,
  email: null,
  phone: null,
  linkedin: null,
  x: null,
  bluesky: null,
  website: null,
  metAt: null,
  notes: null,
  reconnectEveryDays: 60,
  lastContactedAt: null,
  snoozedUntil: null,
  source: "capture",
  createdAt: "2026-10-15T14:00:00.000Z",
};

export const overdueContacts: ReconnectCandidate[] = [
  {
    ...base,
    id: 1,
    name: "Priya Shah",
    title: "Staff Engineer",
    company: "Acme",
    metAt: "Ship London 2026",
    lastContactedAt: "2026-06-17T10:00:00.000Z",
    daysSinceContact: 120,
    lastInteraction: "Talked about migrating Acme's build to Turborepo",
  },
  {
    ...base,
    id: 2,
    name: "Marco Rossi",
    company: "Globex",
    metAt: "Next.js Conf",
    lastContactedAt: "2026-07-27T10:00:00.000Z",
    daysSinceContact: 80,
    lastInteraction: "He wanted an intro to someone on the AI Gateway team",
  },
];

export const newContacts: Contact[] = [
  { ...base, id: 3, name: "Dana Lee", title: "PM", company: "Initech", metAt: "Ship London 2026" },
  {
    ...base,
    id: 4,
    name: "Sam Ortiz",
    company: "Hooli",
    email: "sam@hooli.example",
    source: "shared",
    notes: "Shared via your public page",
  },
];

export const shipLondonContacts: Contact[] = [newContacts[0], overdueContacts[0]];

/** What get_contact returns for Priya: her record plus recent interactions. */
export const priyaDetail = {
  contact: overdueContacts[0],
  interactions: [
    { id: 11, occurredAt: "2026-06-17T10:00:00.000Z", summary: "Talked about migrating Acme's build to Turborepo" },
    { id: 10, occurredAt: "2026-04-01T10:00:00.000Z", summary: "Met at Ship London 2026" },
  ],
};
