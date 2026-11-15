"use client";

import * as React from "react";

export interface VirtualTryOnProduct {
  title: string;
  /** A photo of the product, shown as a thumbnail. */
  image: string;
  /** What is being tried on, e.g. "Bottle green". */
  variant?: string;
}

/** What `onGenerate` resolves to: the result image's URL (https, blob: or data:), or that URL with a note shown under the result. */
export type VirtualTryOnResult = string | { image: string; note?: string };

export interface VirtualTryOnRequest {
  /** The shopper's photo: a JPEG, at most `maxDimension` pixels on its longest side, with its metadata (such as location) removed. */
  photo: File;
  /** Aborted when the shopper cancels or leaves. Pass it to `fetch` so the request stops too. */
  signal: AbortSignal;
  /** The product being tried on, as passed to the component. */
  product: VirtualTryOnProduct;
  /** Report progress from 0 to 1 if your service gives it. Without it, the wait shows an indeterminate bar. */
  onProgress: (fraction: number) => void;
}

export interface VirtualTryOnProps {
  product: VirtualTryOnProduct;
  /**
   * Makes the try-on image. Call your own API route or any try-on service here; the component never sends the photo anywhere itself.
   * Throw or reject to show the error step. A `blob:` URL you return is revoked when the shopper moves on.
   */
  onGenerate: (request: VirtualTryOnRequest) => Promise<VirtualTryOnResult>;
  /** A photo that shows what a good upload looks like. Shown on the first step. */
  exampleImage?: string;
  /** Adds a "Use a sample photo" button that runs the try-on with this image, so shoppers can see how it works first. */
  sampleImage?: string;
  /** The largest photo, in megabytes, handed to `onGenerate`. Bigger photos are scaled down first and refused only if they stay too big. Defaults to 10. */
  maxSizeMb?: number;
  /** The longest side, in pixels, of the photo handed to `onGenerate`. Defaults to 1536. */
  maxDimension?: number;
  /** Ask the shopper to tick a consent box before the photo is used. Defaults to false, which shows the privacy line only. */
  requireConsent?: boolean;
  /** Your privacy policy. Adds a link after the privacy line. */
  privacyHref?: string;
  /** Shows an "Add to bag" button with the result. Return a promise to show "Adding…". */
  onAdd?: () => void | Promise<void>;
  /** Rendered with the result instead of the built-in "Add to bag" button, e.g. your own size picker and buy button. */
  children?: React.ReactNode;
  className?: string;
  /** Override the built-in English text. */
  labels?: Partial<VirtualTryOnLabels>;
}

export interface VirtualTryOnLabels {
  tryingOn: string;
  introTitle: string;
  introText: (product: string) => string;
  tips: string[];
  example: string;
  choosePhoto: string;
  takePhoto: string;
  useSample: string;
  dropHint: string;
  dropHere: string;
  placeholder: string;
  notAPhoto: string;
  tooLarge: (maxSizeMb: number) => string;
  unreadable: string;
  preparing: string;
  readyTitle: string;
  readyText: (product: string) => string;
  yourPhoto: string;
  privacy: string;
  privacyLink: string;
  consent: string;
  consentRequired: string;
  generate: string;
  chooseAnother: string;
  generatingTitle: string;
  generatingText: string;
  progress: (percent: number) => string;
  cancel: string;
  resultTitle: string;
  resultText: string;
  result: (product: string) => string;
  disclaimer: string;
  compare: string;
  before: string;
  after: string;
  compareValue: (photo: number, result: number) => string;
  add: string;
  adding: string;
  added: string;
  tryAnother: string;
  errorTitle: string;
  error: (error: unknown) => string;
  retry: string;
}

const defaultLabels: VirtualTryOnLabels = {
  tryingOn: "Trying on",
  introTitle: "See it on you",
  introText: (product) => `Add a photo of yourself and we'll show you wearing the ${product}.`,
  tips: ["Face the camera, head to hips in the frame", "Stand in good, even light", "Use a plain background"],
  example: "Example photo",
  choosePhoto: "Choose a photo",
  takePhoto: "Take a photo",
  useSample: "Use a sample photo",
  dropHint: "You can also drag a photo here or paste one.",
  dropHere: "Drop your photo here",
  placeholder: "Your photo will appear here",
  notAPhoto: "That file isn't a photo. Choose a JPG, PNG or WebP image.",
  tooLarge: (mb) => `That photo is too large. Choose one under ${mb} MB.`,
  unreadable: "We couldn't open that photo. Try a JPG or PNG.",
  preparing: "Preparing your photo…",
  readyTitle: "Your photo",
  readyText: (product) => `Ready to see the ${product} on you?`,
  yourPhoto: "Your photo",
  privacy: "Your photo is only used to make this preview.",
  privacyLink: "Privacy policy",
  consent: "I agree that my photo is used to make this preview.",
  consentRequired: "Tick the box to continue.",
  generate: "Try it on",
  chooseAnother: "Choose another photo",
  generatingTitle: "Creating your preview",
  generatingText: "This usually takes a few seconds.",
  progress: (percent) => `${percent}% done`,
  cancel: "Cancel",
  resultTitle: "Here's how it looks",
  resultText: "Drag the slider to compare it with your photo.",
  result: (product) => `You wearing the ${product}`,
  disclaimer: "An AI preview. Colour and fit may differ slightly from the real thing.",
  compare: "Compare your photo with the try-on",
  before: "You",
  after: "Try-on",
  compareValue: (photo, result) => `${photo}% your photo, ${result}% try-on`,
  add: "Add to bag",
  adding: "Adding…",
  added: "Added to bag",
  tryAnother: "Try another photo",
  errorTitle: "That didn't work",
  error: () => "We couldn't create your preview. Please try again, or use a different photo.",
  retry: "Try again",
};

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const primaryButton = cx(
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 motion-reduce:transition-none",
  ring,
);
const secondaryButton = cx(
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-border px-6 text-sm font-medium transition-colors duration-150 hover:bg-accent hover:text-accent-foreground motion-reduce:transition-none",
  ring,
);
const linkButton = cx("inline-flex min-h-8 items-center rounded-sm text-sm font-medium underline underline-offset-4 hover:no-underline", ring);
const chip = "pointer-events-none absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm";

const Spinner = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 animate-spin motion-reduce:animate-none">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

const LockIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0">
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </svg>
);

const IMAGE_NAME = /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i;

/** Loads a photo, draws it at most `maxDimension` on its longest side and re-encodes it as JPEG, which also drops its metadata. */
const preparePhoto = async (source: File | string, maxDimension: number): Promise<File> => {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      if (typeof source === "string") image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("unreadable"));
      image.src = url;
    });
    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("unreadable");
    // JPEG has no transparency, so see-through areas become white rather than black.
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("unreadable");
    // Always the same name: the shopper's own file name can contain their name.
    return new File([blob], "photo.jpg", { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
};

const revokeIfBlob = (url: string | undefined) => {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
};

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** The before and after slider on the result step. */
function Compare({ before, after, beforeAlt, afterAlt, text }: { before: string; after: string; beforeAlt: string; afterAlt: string; text: VirtualTryOnLabels }) {
  const [value, setValue] = React.useState(50);
  const [dragging, setDragging] = React.useState(false);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const set = (next: number) => setValue(Math.min(100, Math.max(0, Math.round(next * 10) / 10)));
  const fromPointer = (event: React.PointerEvent) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (rect) set(((event.clientX - rect.left) / rect.width) * 100);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: 10, PageDown: -10 };
    let next: number | undefined;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    else if (event.key in moves) next = Math.round(value) + moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    set(next);
  };
  const stop = () => setDragging(false);
  const shown = Math.round(value);
  const image = "absolute inset-0 h-full w-full select-none object-cover object-top";

  return (
    <div
      ref={frameRef}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        if (event.pointerType === "mouse") fromPointer(event);
      }}
      onPointerMove={(event) => dragging && fromPointer(event)}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      className="absolute inset-0 cursor-col-resize touch-pan-y select-none"
    >
      <img src={after} alt={afterAlt} draggable={false} className={image} />
      <span className={cx(chip, "left-auto right-3")}>{text.after}</span>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
        <img src={before} alt={beforeAlt} draggable={false} className={image} />
        <span className={chip}>{text.before}</span>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-background" style={{ left: `${value}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label={text.compare}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-valuetext={text.compareValue(shown, 100 - shown)}
        onKeyDown={onKeyDown}
        style={{ left: `${value}%` }}
        className={cx(
          "absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-black/10 transition-transform duration-150 motion-reduce:transition-none",
          ring,
          dragging && "scale-110",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
        </svg>
      </div>
    </div>
  );
}

type Step = "intro" | "ready" | "generating" | "result" | "error";

function TryOnPanel({
  product,
  onGenerate,
  exampleImage,
  sampleImage,
  maxSizeMb = 10,
  maxDimension = 1536,
  requireConsent = false,
  privacyHref,
  onAdd,
  children,
  className,
  labels,
  framed,
}: VirtualTryOnProps & { framed: boolean }) {
  const text: VirtualTryOnLabels = { ...defaultLabels, ...labels };
  const id = React.useId();
  const [step, setStep] = React.useState<Step>("intro");
  const [photo, setPhoto] = React.useState<{ file: File; url: string } | null>(null);
  const [result, setResult] = React.useState<{ url: string; note?: string } | null>(null);
  const [preparing, setPreparing] = React.useState(false);
  const [inputError, setInputError] = React.useState("");
  const [failure, setFailure] = React.useState("");
  const [progress, setProgress] = React.useState<number | null>(null);
  const [consented, setConsented] = React.useState(false);
  const [consentError, setConsentError] = React.useState(false);
  const [dropping, setDropping] = React.useState(false);
  const [canCapture, setCanCapture] = React.useState(false);
  const [addState, setAddState] = React.useState<"idle" | "busy" | "added">("idle");

  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const consentRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const moved = React.useRef(false);
  const alive = React.useRef(true);
  const preparingRef = React.useRef(false);
  const latest = React.useRef({ photo, result });
  latest.current = { photo, result };

  // Phones get a "Take a photo" button that opens the front camera.
  React.useEffect(() => {
    setCanCapture(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Leaving the page stops the request and frees the photo and result from memory. Nothing is kept.
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
      revokeIfBlob(latest.current.photo?.url);
      revokeIfBlob(latest.current.result?.url);
    };
  }, []);

  // After each step change the shopper made, move focus to the new heading so screen readers hear where they are.
  React.useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const go = (next: Step) => {
    moved.current = true;
    setStep(next);
  };

  const clearResult = () => {
    revokeIfBlob(latest.current.result?.url);
    setResult(null);
    setAddState("idle");
  };

  const acceptPhoto = async (source: File | string) => {
    if (preparingRef.current) return;
    setInputError("");
    if (typeof source !== "string") {
      const looksLikeImage = source.type.startsWith("image/") || (!source.type && IMAGE_NAME.test(source.name));
      if (!looksLikeImage) return setInputError(text.notAPhoto);
      // Very large files are refused before decoding; anything else is scaled down and checked again below.
      if (source.size > maxSizeMb * 5 * 1024 * 1024) return setInputError(text.tooLarge(maxSizeMb));
    }
    preparingRef.current = true;
    setPreparing(true);
    try {
      const file = await preparePhoto(source, maxDimension);
      // Gone while the photo was being prepared: don't create a URL nobody will free.
      if (!alive.current) return;
      if (file.size > maxSizeMb * 1024 * 1024) return setInputError(text.tooLarge(maxSizeMb));
      // A new photo replaces the old one, so any request still running for the old one is stopped.
      abortRef.current?.abort();
      abortRef.current = null;
      revokeIfBlob(latest.current.photo?.url);
      clearResult();
      setPhoto({ file, url: URL.createObjectURL(file) });
      setConsentError(false);
      go("ready");
    } catch {
      if (alive.current) setInputError(text.unreadable);
    } finally {
      preparingRef.current = false;
      if (alive.current) setPreparing(false);
    }
  };

  const generate = async () => {
    // Wait for a newly chosen photo to be ready, so the request never runs on the one it replaces.
    if (!photo || preparingRef.current) return;
    if (requireConsent && !consented) {
      setConsentError(true);
      consentRef.current?.focus();
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(null);
    setFailure("");
    go("generating");
    try {
      const answer = await onGenerate({
        photo: photo.file,
        signal: controller.signal,
        product,
        onProgress: (fraction) => {
          if (!controller.signal.aborted) setProgress(Math.min(1, Math.max(0, fraction)));
        },
      });
      const next = typeof answer === "string" ? { url: answer } : { url: answer.image, note: answer.note };
      if (controller.signal.aborted) return revokeIfBlob(next.url);
      setResult(next);
      go("result");
    } catch (error) {
      if (controller.signal.aborted) return;
      setFailure(text.error(error));
      go("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    go("ready");
  };

  const restart = () => {
    abortRef.current?.abort();
    revokeIfBlob(photo?.url);
    clearResult();
    setPhoto(null);
    setInputError("");
    go("intro");
  };

  const add = async () => {
    if (addState !== "idle") return;
    setAddState("busy");
    try {
      await onAdd?.();
    } catch {
      setAddState("idle");
      return;
    }
    setAddState("added");
    window.setTimeout(() => setAddState("idle"), 2000);
  };

  const accepting = step === "intro" || step === "ready" || step === "error";

  // Paste a photo from the clipboard, unless the shopper is typing somewhere else on the page.
  React.useEffect(() => {
    if (!accepting) return;
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return;
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
      if (!file) return;
      event.preventDefault();
      void acceptPhoto(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void acceptPhoto(file);
  };

  const dropProps = accepting
    ? {
        onDragOver: (event: React.DragEvent) => {
          if (!Array.from(event.dataTransfer.types).includes("Files")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDropping(true);
        },
        onDragLeave: (event: React.DragEvent) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault();
          setDropping(false);
          const file = event.dataTransfer.files[0];
          if (file) void acceptPhoto(file);
        },
      }
    : {};

  const productLine = product.variant ? `${product.title}, ${product.variant}` : product.title;
  const percent = progress === null ? null : Math.round(progress * 100);

  const privacyLine = (
    <p className="flex gap-2 text-sm text-muted-foreground">
      <LockIcon />
      <span>
        {text.privacy}
        {privacyHref && (
          <>
            {" "}
            <a href={privacyHref} className={cx("rounded-sm text-foreground underline underline-offset-4 hover:no-underline", ring)}>
              {text.privacyLink}
            </a>
          </>
        )}
      </span>
    </p>
  );

  const pickers = (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => fileRef.current?.click()} aria-busy={preparing || undefined} className={primaryButton}>
        {preparing && <Spinner />}
        {preparing ? text.preparing : text.choosePhoto}
      </button>
      {canCapture && (
        <button type="button" onClick={() => cameraRef.current?.click()} className={secondaryButton}>
          {text.takePhoto}
        </button>
      )}
    </div>
  );

  const media = () => {
    if (step === "result" && result && photo)
      return <Compare before={photo.url} after={result.url} beforeAlt={text.yourPhoto} afterAlt={text.result(productLine)} text={text} />;
    if (step === "result" && result) return <img src={result.url} alt={text.result(productLine)} className="absolute inset-0 h-full w-full object-cover object-top" />;
    if (photo)
      return (
        <>
          <img
            src={photo.url}
            alt={text.yourPhoto}
            className={cx("absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 motion-reduce:transition-none", (step === "generating" || step === "error") && "opacity-60")}
          />
          <span className={chip}>{text.yourPhoto}</span>
          {step === "generating" && (
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 animate-pulse bg-background/30 motion-reduce:animate-none" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-background text-foreground shadow-md">
                <Spinner />
              </span>
            </div>
          )}
        </>
      );
    if (exampleImage)
      return (
        <>
          <img src={exampleImage} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
          <span className={chip}>{text.example}</span>
        </>
      );
    return (
      <div className="absolute inset-4 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border text-center text-sm text-muted-foreground">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" />
        </svg>
        {text.placeholder}
      </div>
    );
  };

  const heading = { intro: text.introTitle, ready: text.readyTitle, generating: text.generatingTitle, result: text.resultTitle, error: text.errorTitle }[step];

  return (
    <section
      aria-labelledby={`${id}-title`}
      {...dropProps}
      className={cx("relative grid w-full overflow-hidden bg-card text-card-foreground sm:grid-cols-2", framed && "rounded-xl border border-border", className)}
    >
      <div className={cx("relative w-full overflow-hidden bg-muted", !photo && !exampleImage ? "aspect-[16/9] sm:aspect-[3/4]" : "aspect-[3/4]")}>{media()}</div>

      <div className="flex flex-col gap-5 p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <img src={product.image} alt="" className="h-14 w-12 shrink-0 rounded-md bg-muted object-cover object-top" />
          <p className="min-w-0 text-sm">
            <span className="block text-muted-foreground">{text.tryingOn}</span>
            <span className="block truncate font-medium">{productLine}</span>
          </p>
        </div>

        <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          {heading}
        </h2>

        {step === "intro" && (
          <>
            <p className="-mt-2 text-muted-foreground">{text.introText(product.title)}</p>
            <ul className="flex flex-col gap-2 text-sm">
              {text.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400">
                    <path d="m3.5 8.5 3 3 6-7" />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
            {pickers}
            {sampleImage && (
              <button type="button" onClick={() => void acceptPhoto(sampleImage)} className={cx(linkButton, "self-start")}>
                {text.useSample}
              </button>
            )}
            {inputError && (
              <p role="alert" className="text-sm text-destructive">
                {inputError}
              </p>
            )}
            <p className="hidden text-sm text-muted-foreground sm:block">{text.dropHint}</p>
            {privacyLine}
          </>
        )}

        {step === "ready" && (
          <>
            <p className="-mt-2 text-muted-foreground">{text.readyText(product.title)}</p>
            {requireConsent ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start gap-3">
                  <input
                    ref={consentRef}
                    id={`${id}-consent`}
                    type="checkbox"
                    checked={consented}
                    onChange={(event) => {
                      setConsented(event.target.checked);
                      if (event.target.checked) setConsentError(false);
                    }}
                    aria-invalid={consentError || undefined}
                    aria-describedby={consentError ? `${id}-consent-error` : undefined}
                    className={cx("mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-primary", ring)}
                  />
                  <label htmlFor={`${id}-consent`} className="cursor-pointer text-sm">
                    {text.consent}
                  </label>
                </div>
                {privacyHref && (
                  <a href={privacyHref} className={cx(linkButton, "ml-8 self-start font-normal text-muted-foreground")}>
                    {text.privacyLink}
                  </a>
                )}
                {consentError && (
                  <p id={`${id}-consent-error`} className="ml-8 text-sm text-destructive">
                    {text.consentRequired}
                  </p>
                )}
              </div>
            ) : (
              privacyLine
            )}
            <div className="flex flex-col gap-2">
              <button type="button" onClick={generate} aria-disabled={preparing || undefined} className={cx(primaryButton, preparing && "cursor-not-allowed opacity-50")}>
                {text.generate}
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} aria-busy={preparing || undefined} className={secondaryButton}>
                {preparing && <Spinner />}
                {preparing ? text.preparing : text.chooseAnother}
              </button>
            </div>
            {inputError && (
              <p role="alert" className="text-sm text-destructive">
                {inputError}
              </p>
            )}
          </>
        )}

        {step === "generating" && (
          <>
            <div className="-mt-2 flex flex-col gap-3">
              <p role="status" className="text-muted-foreground">
                {percent === null ? text.generatingText : text.progress(percent)}
              </p>
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                {percent === null ? (
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                ) : (
                  <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
                )}
              </div>
            </div>
            <button type="button" onClick={cancel} className={secondaryButton}>
              {text.cancel}
            </button>
          </>
        )}

        {step === "result" && result && (
          <>
            <p className="-mt-2 text-muted-foreground">{photo ? text.resultText : text.result(product.title)}</p>
            {result.note && <p className="text-sm">{result.note}</p>}
            <div className="flex flex-col gap-2">
              {children ??
                (onAdd && (
                  <button type="button" onClick={add} aria-busy={addState === "busy" || undefined} className={cx(primaryButton, addState === "busy" && "cursor-progress")}>
                    {addState === "busy" && <Spinner />}
                    {addState === "added" && (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    )}
                    {addState === "busy" ? text.adding : addState === "added" ? text.added : text.add}
                  </button>
                ))}
              <button type="button" onClick={restart} className={secondaryButton}>
                {text.tryAnother}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{text.disclaimer}</p>
            <p role="status" className="sr-only">
              {addState === "added" ? text.added : ""}
            </p>
          </>
        )}

        {step === "error" && (
          <>
            <p role="alert" className="-mt-2 text-destructive">
              {failure}
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={generate} aria-disabled={preparing || undefined} className={cx(primaryButton, preparing && "cursor-not-allowed opacity-50")}>
                {text.retry}
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className={secondaryButton}>
                {text.chooseAnother}
              </button>
            </div>
            {inputError && (
              <p role="alert" className="text-sm text-destructive">
                {inputError}
              </p>
            )}
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileChange} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={onFileChange} />

      {dropping && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] border-2 border-dashed border-primary bg-background/80 text-base font-semibold text-foreground">
          {text.dropHere}
        </div>
      )}
    </section>
  );
}

/** The shopper adds a photo and sees the product on themselves. Bring any try-on service through `onGenerate`; the component handles the photo, the wait, the result and the privacy note. */
export function VirtualTryOn(props: VirtualTryOnProps) {
  return <TryOnPanel {...props} framed />;
}

export interface VirtualTryOnDialogProps extends VirtualTryOnProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Leave out the built-in "Try it on" button, e.g. when you open the dialog from your own control with `open`. */
  hideTrigger?: boolean;
  /** Merged onto the "Try it on" button. */
  triggerClassName?: string;
  /** Merged onto the full-screen overlay, e.g. to change its `z-50`. */
  className?: string;
  /** Override the built-in English text, including the trigger and close buttons. */
  labels?: Partial<VirtualTryOnLabels> & { trigger?: string; close?: string; dialog?: (product: string) => string };
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The same try-on in a modal, with a "Try it on" button to open it. Traps focus, closes on Escape and returns focus to the button. */
export function VirtualTryOnDialog({ open, defaultOpen = false, onOpenChange, hideTrigger = false, triggerClassName, labels, className, ...panelProps }: VirtualTryOnDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const text = { trigger: "Try it on", close: "Close", dialog: (product: string) => `Try on the ${product}`, ...labels };

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const body = document.body;
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body && !dialog?.contains(active) ? active : null;
    const { overflow } = body.style;
    body.style.overflow = "hidden";
    if (document.hasFocus()) dialog?.focus({ preventScroll: true });
    const keepInside = (event: FocusEvent) => {
      if (dialog && event.target instanceof Node && !dialog.contains(event.target)) dialog.focus({ preventScroll: true });
    };
    document.addEventListener("focusin", keepInside);
    return () => {
      document.removeEventListener("focusin", keepInside);
      body.style.overflow = overflow;
      if (document.hasFocus()) (opener?.isConnected ? opener : triggerRef.current)?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (event.defaultPrevented) return;
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first: HTMLElement | undefined = focusable[0];
    const last: HTMLElement | undefined = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!first || !last) event.preventDefault();
    else if (event.shiftKey && (active === first || active === event.currentTarget)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {!hideTrigger && (
        <button ref={triggerRef} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={cx(secondaryButton, triggerClassName)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="7.5" r="3.5" />
            <path d="M5 21c.8-4 3.5-6.5 7-6.5s6.2 2.5 7 6.5" />
          </svg>
          {text.trigger}
        </button>
      )}
      {isOpen && (
        <div className={cx("fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6", className)}>
          <div aria-hidden="true" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={text.dialog(panelProps.product.title)}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className="relative flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-card text-card-foreground shadow-xl outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-xl"
          >
            <div className="flex justify-end border-b border-border p-1.5">
              <button type="button" aria-label={text.close} onClick={() => setOpen(false)} className={cx("flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground", ring)}>
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain">
              <TryOnPanel {...panelProps} labels={labels} framed={false} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
