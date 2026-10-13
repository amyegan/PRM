"use client";

import { useEveAgent } from "eve/react";
import { AlertCircleIcon, LoaderIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WEB_CHAT_AGENT } from "@/app/eve-agent";
import { AgentMessage } from "./agent-message";
import { ModeTabs, type Photo, PhotoPicker } from "./photo-picker";

const SAVE_TOOLS = new Set(["save_contact", "update_contact"]);

type CaptureMode = "photo" | "social";

const MODES = [
  { value: "photo", label: "Photo" },
  { value: "social", label: "Social link" },
] as const;

export type CaptureDraft = {
  readonly mode: CaptureMode;
  readonly photo?: Photo;
  readonly socialUrl: string;
  readonly name: string;
  readonly metAt: string;
  readonly notes: string;
};

type AgentEvents = ReturnType<typeof useEveAgent>["events"];

/**
 * One capture is one agent session. Remount (via `key`) to start the next capture fresh;
 * pass the current draft back to retry with the same photo and details.
 */
export function CaptureForm({
  initialDraft,
  onReset,
}: {
  readonly initialDraft?: CaptureDraft;
  readonly onReset: (retry?: CaptureDraft) => void;
}) {
  const agent = useEveAgent({ agent: WEB_CHAT_AGENT });
  const [mode, setMode] = useState<CaptureMode>(initialDraft?.mode ?? "photo");
  const [photo, setPhoto] = useState(initialDraft?.photo);
  const [socialUrl, setSocialUrl] = useState(initialDraft?.socialUrl ?? "");
  const [name, setName] = useState(initialDraft?.name ?? "");
  const [metAt, setMetAt] = useState(initialDraft?.metAt ?? "");
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [error, setError] = useState<string>();

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const submitted = agent.data.messages.length > 0;
  const replies = agent.data.messages.filter((message) => message.role === "assistant");
  const outcome = isBusy || !submitted ? undefined : captureOutcome(agent.events, agent.error);

  const draft: CaptureDraft = { mode, photo, socialUrl, name, metAt, notes };
  const canSubmit = mode === "photo" ? photo !== undefined : socialUrl.trim().length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    const extras = [
      metAt.trim() && `We met at: ${metAt.trim()}.`,
      notes.trim() && `Notes: ${notes.trim()}`,
    ].filter(Boolean);

    if (mode === "social") {
      const lines = [
        `Capture the contact from this social profile: ${socialUrl.trim()}`,
        name.trim() && `Their name: ${name.trim()}.`,
        ...extras,
      ];
      await agent.send(lines.filter(Boolean).join("\n"));
      return;
    }

    if (!photo) return;
    await agent.send([
      { type: "text", text: ["Capture the contact in this photo.", ...extras].join("\n") },
      { type: "file", data: photo.dataUrl, mediaType: "image/jpeg", filename: photo.name },
    ]);
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <ModeTabs disabled={submitted} modes={MODES} onChange={setMode} value={mode} />
        {mode === "photo" ? (
          <PhotoPicker
            disabled={submitted}
            label="Take or choose a photo of a badge or business card"
            onError={setError}
            onPhoto={(next) => {
              setError(undefined);
              setPhoto(next);
            }}
            photo={photo}
          />
        ) : (
          <>
            <Input
              disabled={submitted}
              inputMode="url"
              onChange={(event) => setSocialUrl(event.currentTarget.value)}
              placeholder="LinkedIn, X, or Bluesky profile link"
              value={socialUrl}
            />
            <Input
              disabled={submitted}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Their name (optional for Bluesky)"
              value={name}
            />
          </>
        )}
        <Input
          disabled={submitted}
          onChange={(event) => setMetAt(event.currentTarget.value)}
          placeholder="Where did you meet? (optional)"
          value={metAt}
        />
        <Input
          disabled={submitted}
          onChange={(event) => setNotes(event.currentTarget.value)}
          placeholder="Notes, e.g. “wants an intro to our infra team” (optional)"
          value={notes}
        />
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        {submitted ? null : (
          <Button disabled={!canSubmit} type="submit">
            Save contact
          </Button>
        )}
      </form>

      {submitted ? (
        <section aria-live="polite" className="flex flex-col gap-4">
          {replies.map((message, index) => (
            <AgentMessage
              canRespond={(requestId) => agent.data.inputs[requestId]?.status === "open"}
              isStreaming={agent.status === "streaming" && index === replies.length - 1}
              key={message.id}
              message={message}
              onInputResponses={(responses) => agent.respond(responses)}
              questionsFor={(callId) =>
                Object.values(agent.data.inputs).filter(
                  (input) => input.request.kind === "question" && input.request.action.callId === callId,
                )
              }
            />
          ))}
          {isBusy ? (
            <p className="flex items-center gap-2 text-muted-foreground text-sm">
              <LoaderIcon className="size-4 animate-spin" />{" "}
              {mode === "photo" ? "Reading the photo…" : "Looking up the profile…"}
            </p>
          ) : null}
          {outcome?.saved === false ? (
            <div
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
              role="alert"
            >
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium">The contact wasn't saved</p>
                <p className="mt-0.5 text-muted-foreground">{outcome.message}</p>
              </div>
            </div>
          ) : null}
          {outcome?.saved === false ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onReset(draft)} type="button">
                <RotateCcwIcon className="size-4" /> Try again
              </Button>
              <Button onClick={() => onReset()} type="button" variant="outline">
                Start over
              </Button>
            </div>
          ) : null}
          {outcome?.saved ? (
            <Button onClick={() => onReset()} type="button" variant="outline">
              <RotateCcwIcon className="size-4" /> Capture another
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

/**
 * A capture succeeded only if a save or update tool call completed. Anything else (a failed
 * turn, a failed tool call, or a reply without saving) is reported as an error.
 */
function captureOutcome(
  events: AgentEvents,
  transportError: Error | undefined,
): { saved: true } | { saved: false; message: string } {
  let failure: string | undefined;
  for (const event of events) {
    if (event.type === "action.result") {
      const { result, status, error } = event.data;
      if (result.kind !== "tool-result" || !SAVE_TOOLS.has(result.toolName)) continue;
      const output = result.output as { error?: unknown } | null;
      if (status === "completed" && !result.isError && !output?.error) return { saved: true };
      failure =
        error?.message ?? (typeof output?.error === "string" ? output.error : "Saving to the database failed.");
    } else if (event.type === "turn.failed") {
      failure =
        event.data.code === "MODEL_CALL_FAILED"
          ? "The model is temporarily unavailable."
          : event.data.message;
    }
  }
  return {
    saved: false,
    message:
      transportError?.message ??
      failure ??
      "The agent didn't save a contact. Check its reply above.",
  };
}
