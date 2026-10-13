import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidShareKey } from "@/lib/share";
import { ShareForm } from "./share-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share your contact info",
  robots: { index: false, follow: false },
};

export default async function SharePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!isValidShareKey(key)) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-medium text-3xl tracking-tight">Let's stay in touch</h1>
        <p className="text-muted-foreground text-sm">
          Share your contact info with a photo of your badge or business card, a social profile, or by
          typing it in.
        </p>
      </header>
      <ShareForm shareKey={key as string} />
    </main>
  );
}
