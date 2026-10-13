import Link from "next/link";
import { APP_NAME } from "@/lib/config";

const LINKS = [
  { href: "/", label: "Capture" },
  { href: "/contacts", label: "Contacts" },
  { href: "/s", label: "Chat" },
];

export function SiteNav({ current }: { readonly current: string }) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      <span className="mr-auto font-medium">{APP_NAME}</span>
      {LINKS.map((link) => (
        <Link
          aria-current={link.href === current ? "page" : undefined}
          className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
