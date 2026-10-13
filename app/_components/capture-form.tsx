"use client";

import { useEveAgent } from "eve/react";
import { CameraIcon, LoaderIcon, RotateCcwIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WEB_CHAT_AGENT } from "@/app/eve-agent";
import { AgentMessage } from "./agent-message";

const MAX_IMAGE_EDGE = 1600;

/** One capture is one agent session. Remount (via `key`) to start the next capture fresh. */
export function CaptureForm({ onReset }: { readonly onReset: () => void }) {
  const agent = useEveAgent({ agent: WEB_CHAT_AGENT });
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ dataUrl: string; name: string }>();
  const [metAt, setMetAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const submitted = agent.data.messages.length > 0;
  const replies = agent.data.messages.filter((message) => message.role === "assistant");

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    try {
      setPhoto({ dataUrl: await downscale(file), name: file.name });
    } catch {
      setError("Couldn't read that image. Try a JPEG or PNG.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!photo) return;
    const details = [
      "Capture the contact in this photo.",
      metAt.trim() && `We met at: ${metAt.trim()}.`,
      notes.trim() && `Notes: ${notes.trim()}`,
    ].filter(Boolean);
    await agent.send([
      { type: "text", text: details.join("\n") },
      { type: "file", data: photo.dataUrl, mediaType: "image/jpeg", filename: photo.name },
    ]);
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <button
          className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 text-muted-foreground transition hover:bg-muted disabled:cursor-default"
          disabled={submitted}
          onClick={() => fileInput.current?.click()}
          type="button"
        >
          {photo ? (
            // biome-ignore lint/performance/noImgElement: local data URL preview
            <img alt="Selected badge or card" className="size-full object-contain" src={photo.dataUrl} />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm">
              <CameraIcon className="size-8" />
              Take or choose a photo of a badge or business card
            </span>
          )}
        </button>
        <input
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void choosePhoto(event.currentTarget.files?.[0])}
          ref={fileInput}
          type="file"
        />
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
          <Button disabled={!photo} type="submit">
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
              <LoaderIcon className="size-4 animate-spin" /> Reading the photo…
            </p>
          ) : null}
          {agent.error ? <p className="text-destructive text-sm">{agent.error.message}</p> : null}
          {isBusy ? null : (
            <Button onClick={onReset} type="button" variant="outline">
              <RotateCcwIcon className="size-4" /> Capture another
            </Button>
          )}
        </section>
      ) : null}
    </div>
  );
}

/** Phone photos are often 5–10 MB; shrink them before they go to the model. */
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
