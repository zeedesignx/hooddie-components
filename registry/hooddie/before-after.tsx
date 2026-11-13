"use client";

import * as React from "react";

export interface BeforeAfterImage {
  src: string;
  /** Describe what the photo shows, e.g. "Sam in a white T-shirt". */
  alt: string;
}

export interface BeforeAfterProps {
  /** Shown on the left, or on top when `orientation` is "vertical". */
  before: BeforeAfterImage;
  /** Shown on the right, or underneath when `orientation` is "vertical". */
  after: BeforeAfterImage;
  /** Where the divider sits, in percent from the left (or top). Pass it to control the slider yourself. */
  value?: number;
  /** Where the divider starts when `value` is not passed. Defaults to 50. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** "horizontal" moves the divider left and right; "vertical" moves it up and down. Defaults to "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Any CSS aspect ratio for the frame. Defaults to "3 / 4", a portrait photo. */
  aspectRatio?: string;
  /** How the photos fill the frame. Defaults to "cover". */
  fit?: "cover" | "contain";
  /** Hide the "Before" and "After" tags on the photos. */
  hideLabels?: boolean;
  className?: string;
  /** Override the built-in English text. `slider` names the control; `position` is what screen readers hear as it moves. */
  labels?: { before?: string; after?: string; slider?: string; position?: (before: number, after: number) => string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/** A slider that compares two photos, such as the shopper's photo and a try-on result. Drag the divider, tap anywhere, or use the arrow keys. */
export function BeforeAfter({
  before,
  after,
  value,
  defaultValue = 50,
  onValueChange,
  orientation = "horizontal",
  aspectRatio = "3 / 4",
  fit = "cover",
  hideLabels = false,
  className,
  labels,
}: BeforeAfterProps) {
  const [internal, setInternal] = React.useState(() => clamp(defaultValue));
  const current = clamp(value ?? internal);
  const [dragging, setDragging] = React.useState(false);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const vertical = orientation === "vertical";
  const text = {
    before: "Before",
    after: "After",
    slider: "Compare before and after",
    position: (b: number, a: number) => `${b}% before, ${a}% after`,
    ...labels,
  };

  const set = (next: number) => {
    const rounded = Math.round(clamp(next) * 10) / 10;
    if (rounded === current) return;
    if (value === undefined) setInternal(rounded);
    onValueChange?.(rounded);
  };

  const fromPointer = (event: React.PointerEvent) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    set(vertical ? ((event.clientY - rect.top) / rect.height) * 100 : ((event.clientX - rect.left) / rect.width) * 100);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    // A mouse click jumps the divider there. A touch only moves it once the finger moves, so a tap to scroll doesn't.
    if (event.pointerType === "mouse") fromPointer(event);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) fromPointer(event);
  };

  const stop = () => setDragging(false);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const big = 10;
    const small = event.shiftKey ? big : 1;
    // Keys follow the divider on screen: right and down move it towards the end.
    const steps: Record<string, number> = vertical
      ? { ArrowDown: small, ArrowUp: -small, ArrowRight: small, ArrowLeft: -small, PageDown: big, PageUp: -big }
      : { ArrowRight: small, ArrowLeft: -small, ArrowUp: small, ArrowDown: -small, PageUp: big, PageDown: -big };
    let next: number | undefined;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    else if (event.key in steps) next = Math.round(current) + steps[event.key];
    if (next === undefined) return;
    event.preventDefault();
    set(next);
  };

  const shown = Math.round(current);
  const image = cx("absolute inset-0 h-full w-full select-none", fit === "contain" ? "object-contain" : "object-cover object-top");
  const tag = "pointer-events-none absolute rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm";

  return (
    <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      style={{ aspectRatio }}
      className={cx(
        "relative w-full select-none overflow-hidden rounded-lg bg-muted text-foreground",
        vertical ? "cursor-row-resize touch-pan-x" : "cursor-col-resize touch-pan-y",
        className,
      )}
    >
      <img src={after.src} alt={after.alt} draggable={false} className={image} />
      {!hideLabels && <span className={cx(tag, vertical ? "bottom-3 left-3" : "right-3 top-3")}>{text.after}</span>}

      <div
        className="absolute inset-0"
        style={{ clipPath: vertical ? `inset(0 0 ${100 - current}% 0)` : `inset(0 ${100 - current}% 0 0)` }}
      >
        <img src={before.src} alt={before.alt} draggable={false} className={image} />
        {!hideLabels && <span className={cx(tag, "left-3 top-3")}>{text.before}</span>}
      </div>

      <div
        aria-hidden="true"
        className={cx("pointer-events-none absolute bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.12)]", vertical ? "inset-x-0 h-0.5 -translate-y-1/2" : "inset-y-0 w-0.5 -translate-x-1/2")}
        style={vertical ? { top: `${current}%` } : { left: `${current}%` }}
      />

      <div
        role="slider"
        tabIndex={0}
        aria-label={text.slider}
        aria-orientation={orientation}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-valuetext={text.position(shown, 100 - shown)}
        onKeyDown={onKeyDown}
        style={vertical ? { top: `${current}%`, left: "50%" } : { left: `${current}%`, top: "50%" }}
        className={cx(
          "absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-black/10 transition-transform duration-150 motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          dragging && "scale-110",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cx("h-5 w-5", vertical && "rotate-90")}>
          <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
        </svg>
      </div>
    </div>
  );
}
