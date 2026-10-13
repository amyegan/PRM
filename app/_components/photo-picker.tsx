"use client";

import { CameraIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const MAX_IMAGE_EDGE = 1600;

export type Photo = { readonly dataUrl: string; readonly name: string };

/** Tap-to-pick photo area that opens the camera on phones and downscales the result. */
export function PhotoPicker({
  disabled,
  label,
  onError,
  onPhoto,
  photo,
}: {
  readonly disabled?: boolean;
  readonly label: string;
  readonly onError: (message: string) => void;
  readonly onPhoto: (photo: Photo) => void;
  readonly photo?: Photo;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  async function choose(file: File | undefined) {
    if (!file) return;
    try {
      onPhoto({ dataUrl: await downscale(file), name: file.name });
    } catch {
      onError("Couldn't read that image. Try a JPEG or PNG.");
    }
  }

  return (
    <>
      <button
        className={cn(
          "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 text-muted-foreground transition hover:bg-muted disabled:cursor-default",
        )}
        disabled={disabled}
        onClick={() => fileInput.current?.click()}
        type="button"
      >
        {photo ? (
          // biome-ignore lint/performance/noImgElement: local data URL preview
          <img alt="Selected" className="size-full object-contain" src={photo.dataUrl} />
        ) : (
          <span className="flex flex-col items-center gap-2 px-6 text-center text-sm">
            <CameraIcon className="size-8" />
            {label}
          </span>
        )}
      </button>
      <input
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void choose(event.currentTarget.files?.[0])}
        ref={fileInput}
        type="file"
      />
    </>
  );
}

/** Small segmented control for switching between ways to enter a contact. */
export function ModeTabs<T extends string>({
  disabled,
  modes,
  onChange,
  value,
}: {
  readonly disabled?: boolean;
  readonly modes: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
  readonly value: T;
}) {
  return (
    <div className="flex rounded-lg bg-muted p-1 text-sm" role="tablist">
      {modes.map((mode) => (
        <button
          aria-selected={mode.value === value}
          className="flex-1 rounded-md px-3 py-1.5 text-muted-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-xs disabled:opacity-60"
          disabled={disabled}
          key={mode.value}
          onClick={() => onChange(mode.value)}
          role="tab"
          type="button"
        >
          {mode.label}
        </button>
      ))}
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
