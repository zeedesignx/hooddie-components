"use client";

import * as React from "react";

export interface ProductGalleryImage {
  src: string;
  /** Describes the photo. Read to screen readers on the main photo and on its thumbnail. */
  alt: string;
}

export interface ProductGalleryProps {
  images: ProductGalleryImage[];
  /** The photo on show, counting from 0. Pass it to control the gallery yourself. */
  index?: number;
  /** The photo shown first when `index` is not passed. Defaults to 0. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Blend the photos into the grey background. Use for packshots on white. */
  blend?: boolean;
  className?: string;
  /** Override the built-in English text. `position` takes the placeholders {current} and {total}. */
  labels?: { gallery?: string; previous?: string; next?: string; position?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const Chevron = ({ flip = false }: { flip?: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cx("h-5 w-5", flip && "rotate-180")}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/** Product photos: one large photo with thumbnails, previous and next buttons, arrow keys, and swipe on touch screens. */
export function ProductGallery({ images, index, defaultIndex = 0, onIndexChange, blend = false, className, labels }: ProductGalleryProps) {
  const [internal, setInternal] = React.useState(defaultIndex);
  const strip = React.useRef<HTMLDivElement>(null);
  const swipe = React.useRef<{ x: number; y: number } | null>(null);
  const count = images.length;
  const current = Math.min(Math.max(index ?? internal, 0), Math.max(count - 1, 0));
  const text = { gallery: "Product photos", previous: "Previous photo", next: "Next photo", position: "Photo {current} of {total}", ...labels };
  const position = (i: number) => text.position.replace("{current}", String(i + 1)).replace("{total}", String(count));

  // Keep the active thumbnail in view when the row of thumbnails scrolls.
  React.useEffect(() => {
    const row = strip.current;
    const thumb = row?.children[current];
    if (row && thumb instanceof HTMLElement) row.scrollLeft = thumb.offsetLeft - (row.clientWidth - thumb.offsetWidth) / 2;
  }, [current]);

  if (count === 0) return null;

  const go = (next: number, focusThumb = false) => {
    const target = Math.min(Math.max(next, 0), count - 1);
    if (target === current) return;
    if (index === undefined) setInternal(target);
    onIndexChange?.(target);
    const thumb = strip.current?.children[target];
    if (focusThumb && thumb instanceof HTMLElement) thumb.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    // When a thumbnail has focus, focus follows the photo. On the arrow buttons it stays put.
    go(current + (event.key === "ArrowRight" ? 1 : -1), strip.current?.contains(document.activeElement) ?? false);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
  };

  const arrow =
    "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <div role="group" aria-label={text.gallery} onKeyDown={onKeyDown} className={cx("flex flex-col gap-2 text-foreground", className)}>
      <div
        className="relative aspect-[4/5] touch-pan-y select-none overflow-hidden rounded-lg bg-muted"
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") swipe.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {images.map((image, i) => (
          <img
            key={`${i}-${image.src}`}
            src={image.src}
            alt={i === current ? image.alt : ""}
            aria-hidden={i === current ? undefined : true}
            draggable={false}
            loading={i === current ? undefined : "lazy"}
            className={cx(
              "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 motion-reduce:transition-none",
              blend && "mix-blend-multiply dark:mix-blend-normal",
              i !== current && "opacity-0",
            )}
          />
        ))}
        {count > 1 && (
          <>
            <button type="button" aria-label={text.previous} aria-disabled={current === 0 || undefined} onClick={() => go(current - 1)} className={cx(arrow, "left-3", current === 0 && "cursor-default opacity-40")}>
              <Chevron flip />
            </button>
            <button type="button" aria-label={text.next} aria-disabled={current === count - 1 || undefined} onClick={() => go(current + 1)} className={cx(arrow, "right-3", current === count - 1 && "cursor-default opacity-40")}>
              <Chevron />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div ref={strip} className="relative -mx-1 flex gap-2 overflow-x-auto scroll-smooth p-1 motion-reduce:scroll-auto">
          {images.map((image, i) => (
            <button
              key={`${i}-${image.src}`}
              type="button"
              aria-label={`${position(i)}: ${image.alt}`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => go(i)}
              className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <img src={image.src} alt="" loading="lazy" draggable={false} className={cx("h-full w-full object-cover object-top", blend && "mix-blend-multiply dark:mix-blend-normal")} />
              <span aria-hidden="true" className={cx("absolute inset-0 rounded-md border-2 transition-colors duration-150 motion-reduce:transition-none", i === current ? "border-foreground" : "border-transparent")} />
            </button>
          ))}
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {position(current)}
      </p>
    </div>
  );
}
