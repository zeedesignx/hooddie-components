"use client";

import * as React from "react";

export interface ProductSpinProps {
  /** Photos taken at even steps around the product, in order. Any number works; 24 to 36 turns smoothly. */
  frames: string[];
  /** What the product is, e.g. "Classic Hoodie in bottle green". Used for the photo's alt text and the control's name. */
  alt: string;
  /** The frame on show, from 0. Pass it to control the viewer yourself. */
  value?: number;
  /** The frame shown first when `value` is not passed. Defaults to 0. */
  defaultValue?: number;
  onValueChange?: (frame: number) => void;
  /** Turn the product once on load. Skipped for visitors who ask for reduced motion, and stopped by any touch, click or key. */
  autoRotate?: boolean;
  /** How long the one turn of `autoRotate` takes, in milliseconds. Defaults to 2400. */
  autoRotateDuration?: number;
  /** How far a drag across the whole viewer turns the product, in turns. Defaults to 1. */
  dragTurns?: number;
  /** Swap the turning direction, for frames shot the other way round. */
  reverse?: boolean;
  /** Any CSS aspect ratio for the frame. Defaults to "4 / 5". */
  aspectRatio?: string;
  /** Blend the photos into the grey background. Use for packshots on white. */
  blend?: boolean;
  className?: string;
  /** Override the built-in English text. `position` is what screen readers hear as the product turns. */
  labels?: { viewer?: (alt: string) => string; hint?: string; position?: (degrees: number, frame: number, total: number) => string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const wrap = (index: number, total: number) => ((index % total) + total) % total;

/** A 360° viewer built from photos taken around the product. Drag or swipe to turn it, or focus it and use the arrow keys. */
export function ProductSpin({
  frames,
  alt,
  value,
  defaultValue = 0,
  onValueChange,
  autoRotate = false,
  autoRotateDuration = 2400,
  dragTurns = 1,
  reverse = false,
  aspectRatio = "4 / 5",
  blend = false,
  className,
  labels,
}: ProductSpinProps) {
  const total = frames.length;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = total ? wrap(Math.round(value ?? internal), total) : 0;
  /** The shopper has touched, clicked or pressed a key: hide the hint and stop any auto-rotate. */
  const [touched, setTouched] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const drag = React.useRef<{ x: number; frame: number } | null>(null);
  /** Frames left in the one auto-rotate turn. Null until it starts. */
  const turnLeft = React.useRef<number | null>(null);
  const currentRef = React.useRef(current);
  currentRef.current = current;
  const text = {
    viewer: (name: string) => `360° view of ${name}`,
    hint: "Drag to turn",
    position: (degrees: number, frame: number, count: number) => `${degrees} degrees, ${frame} of ${count}`,
    ...labels,
  };

  // Kept in a ref so `set` stays the same function: a controlled `value` changing every frame must not restart the auto-rotate.
  const control = React.useRef({ controlled: value !== undefined, onValueChange });
  control.current = { controlled: value !== undefined, onValueChange };

  const set = React.useCallback(
    (next: number) => {
      if (!total) return;
      const frame = wrap(next, total);
      if (frame === currentRef.current) return;
      currentRef.current = frame;
      if (!control.current.controlled) setInternal(frame);
      control.current.onValueChange?.(frame);
    },
    [total],
  );

  // Fetch every frame up front so the first drag doesn't stall on the network.
  React.useEffect(() => {
    const loaders = frames.map((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      return img;
    });
    return () => loaders.forEach((img) => (img.src = ""));
  }, [frames]);

  // One turn on load, unless the visitor prefers less motion or has already taken over.
  React.useEffect(() => {
    if (!autoRotate || touched || total < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (turnLeft.current === null) turnLeft.current = total;
    if (turnLeft.current <= 0) return;
    const timer = window.setInterval(() => {
      set(currentRef.current + (reverse ? -1 : 1));
      turnLeft.current = (turnLeft.current ?? 1) - 1;
      if (turnLeft.current <= 0) window.clearInterval(timer);
    }, autoRotateDuration / total);
    return () => window.clearInterval(timer);
  }, [autoRotate, autoRotateDuration, touched, total, reverse, set]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, frame: current };
    setTouched(true);
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const width = event.currentTarget.getBoundingClientRect().width || 1;
    const perFrame = width / (total * dragTurns);
    // The product follows the finger: dragging left brings the next frame round.
    const moved = Math.round((drag.current.x - event.clientX) / perFrame);
    set(drag.current.frame + (reverse ? -moved : moved));
  };

  const stop = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const quarter = Math.max(1, Math.round(total / 4));
    const dir = reverse ? -1 : 1;
    let next: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = current + dir;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = current - dir;
    else if (event.key === "PageUp") next = current + quarter * dir;
    else if (event.key === "PageDown") next = current - quarter * dir;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = total - 1;
    if (next === undefined) return;
    event.preventDefault();
    setTouched(true);
    set(next);
  };

  if (!total) return null;
  const degrees = Math.round((current / total) * 360);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={text.viewer(alt)}
      aria-valuemin={0}
      aria-valuemax={total - 1}
      aria-valuenow={current}
      aria-valuetext={text.position(degrees, current + 1, total)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      style={{ aspectRatio }}
      className={cx(
        "relative w-full touch-pan-y select-none overflow-hidden rounded-lg bg-muted text-foreground",
        dragging ? "cursor-grabbing" : "cursor-grab",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {frames.map((src, i) => (
        <img
          key={`${i}-${src}`}
          src={src}
          alt={i === current ? alt : ""}
          aria-hidden={i === current ? undefined : true}
          draggable={false}
          decoding="async"
          className={cx("absolute inset-0 h-full w-full object-contain", blend && "mix-blend-multiply dark:mix-blend-normal", i === current ? "visible" : "invisible")}
        />
      ))}

      <span
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-opacity duration-300 motion-reduce:transition-none",
          touched ? "opacity-0" : "opacity-100",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12 8c5 0 9 1.8 9 4s-4 4-9 4-9-1.8-9-4c0-1.2 1.2-2.3 3-3" />
          <path d="m10 5.5 2.5 2.5-2.5 2.5" />
        </svg>
        {text.hint}
      </span>
    </div>
  );
}
