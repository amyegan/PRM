"use client";

import { AlertCircleIcon, CheckCircle2Icon, LoaderIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { ModeTabs, type Photo, PhotoPicker } from "@/app/_components/photo-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ShareResult, submitSharedContact } from "./actions";

type ShareMode = "photo" | "social" | "manual";

const MODES = [
  { value: "social", label: "Social profile" },
  { value: "photo", label: "Card photo" },
  { value: "manual", label: "Type it" },
] as const;

export function ShareForm({ shareKey }: { readonly shareKey: string }) {
  const [mode, setMode] = useState<ShareMode>("social");
  const [photo, setPhoto] = useState<Photo>();
  const [socialUrl, setSocialUrl] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [metAt, setMetAt] = useState("");
  const [message, setMessage] = useState("");
  const [fax, setFax] = useState("");
  const [result, setResult] = useState<ShareResult>();
  const [pending, startTransition] = useTransition();

  const canSubmit =
    mode === "photo"
      ? photo !== undefined
      : mode === "social"
        ? socialUrl.trim().length > 0
        : name.trim().length > 0 && email.trim().length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || pending) return;
    const shared = { key: shareKey, fax, metAt, message };
    const payload =
      mode === "photo"
        ? { ...shared, mode, photo: photo?.dataUrl }
        : mode === "social"
          ? { ...shared, mode, socialUrl, name }
          : { ...shared, mode, name, email, company };
    startTransition(async () => {
      setResult(await submitSharedContact(payload));
    });
  }

  if (result?.ok) {
    return (
      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-4" role="status">
        <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-green-600" />
        <div>
          <p className="font-medium">Thanks, {result.name}!</p>
          <p className="mt-0.5 text-muted-foreground text-sm">Your contact info was sent.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <ModeTabs
        disabled={pending}
        modes={MODES}
        onChange={(next) => {
          setResult(undefined);
          setMode(next);
        }}
        value={mode}
      />

      {mode === "photo" ? (
        <PhotoPicker
          disabled={pending}
          label="Take or choose a photo of your business card"
          onError={(error) => setResult({ ok: false, error })}
          onPhoto={(next) => {
            setResult(undefined);
            setPhoto(next);
          }}
          photo={photo}
        />
      ) : null}

      {mode === "social" ? (
        <>
          <Input
            disabled={pending}
            inputMode="url"
            onChange={(event) => setSocialUrl(event.currentTarget.value)}
            placeholder="Your LinkedIn, X, or Bluesky profile link"
            value={socialUrl}
          />
          <Input
            autoComplete="name"
            disabled={pending}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Your name (optional for Bluesky)"
            value={name}
          />
        </>
      ) : null}

      {mode === "manual" ? (
        <>
          <Input
            autoComplete="name"
            disabled={pending}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Your name"
            required
            value={name}
          />
          <Input
            autoComplete="email"
            disabled={pending}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="Your email"
            required
            type="email"
            value={email}
          />
          <Input
            autoComplete="organization"
            disabled={pending}
            onChange={(event) => setCompany(event.currentTarget.value)}
            placeholder="Company (optional)"
            value={company}
          />
        </>
      ) : null}

      <Input
        disabled={pending}
        onChange={(event) => setMetAt(event.currentTarget.value)}
        placeholder="Where did we meet? (optional)"
        value={metAt}
      />
      <Textarea
        disabled={pending}
        maxLength={1000}
        onChange={(event) => setMessage(event.currentTarget.value)}
        placeholder="Anything you'd like to add? (optional)"
        value={message}
      />
      {/* Honeypot: hidden from people, often filled in by bots. */}
      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        name="fax"
        onChange={(event) => setFax(event.currentTarget.value)}
        tabIndex={-1}
        value={fax}
      />

      {result && !result.ok ? (
        <div
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
          role="alert"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{result.error}</p>
        </div>
      ) : null}

      <Button disabled={!canSubmit || pending} type="submit">
        {pending ? (
          <>
            <LoaderIcon className="size-4 animate-spin" /> Sending…
          </>
        ) : (
          "Send my contact info"
        )}
      </Button>
    </form>
  );
}
