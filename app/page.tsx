"use client";

import { useState } from "react";
import { CaptureForm } from "@/app/_components/capture-form";
import { SiteNav } from "@/app/_components/site-nav";

export default function CapturePage() {
  const [captureKey, setCaptureKey] = useState(0);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-6">
      <SiteNav current="/" />
      <header className="flex flex-col gap-1">
        <h1 className="font-medium text-3xl tracking-tight">Capture a contact</h1>
        <p className="text-muted-foreground text-sm">
          Snap a conference badge or business card. The agent reads it and saves the contact.
        </p>
      </header>
      <CaptureForm key={captureKey} onReset={() => setCaptureKey((key) => key + 1)} />
    </main>
  );
}
