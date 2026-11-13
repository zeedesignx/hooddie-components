"use client";

import * as React from "react";

export interface WishlistButtonProps {
  /** Whether the product is saved. Pass it with `onValueChange` to control the button. */
  value?: boolean;
  /** Saved state on first render when uncontrolled. Defaults to false. */
  defaultValue?: boolean;
  /** Called with the new state. The heart changes straight away; return a promise and it changes back if the promise rejects. */
  onValueChange?: (saved: boolean) => void | Promise<void>;
  /** "icon" is a round heart for product photos and cards, "text" is a heart with a word for product pages. Defaults to "icon". */
  variant?: "icon" | "text";
  className?: string;
  /**
   * Override the built-in English text. `label` is the icon button's name, so make it unique per product in a
   * grid, e.g. "Save Classic Hoodie". `save` and `saved` are the visible words of the text variant. `added`,
   * `removed` and `failed` are announced to screen readers; `failed` is also shown.
   */
  labels?: { label?: string; save?: string; saved?: string; added?: string; removed?: string; failed?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** A heart that saves a product to the wishlist. Updates at once, rolls back if saving fails, and tells screen readers what happened. */
export function WishlistButton({ value, defaultValue = false, onValueChange, variant = "icon", className, labels }: WishlistButtonProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  /** The state shown while a save is in flight. */
  const [pending, setPending] = React.useState<boolean | null>(null);
  const [message, setMessage] = React.useState("");
  const [failed, setFailed] = React.useState(false);
  const alive = React.useRef(true);
  const saved = pending ?? value ?? internal;
  const text = {
    label: "Save to wishlist",
    save: "Save",
    saved: "Saved",
    added: "Saved to wishlist",
    removed: "Removed from wishlist",
    failed: "Couldn't update your wishlist. Try again.",
    ...labels,
  };

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const handleClick = async () => {
    // One change at a time: presses while saving are ignored.
    if (pending !== null) return;
    const next = !saved;
    setPending(next);
    setFailed(false);
    setMessage("");
    try {
      await onValueChange?.(next);
    } catch {
      if (!alive.current) return;
      setPending(null);
      setFailed(true);
      setMessage(text.failed);
      return;
    }
    if (!alive.current) return;
    if (value === undefined) setInternal(next);
    setPending(null);
    setMessage(next ? text.added : text.removed);
  };

  const heart = (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={saved ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      className={cx("h-5 w-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none", saved ? "scale-110 text-destructive" : "scale-100")}
    >
      <path d="M12 20.5s-7.5-4.4-9.3-9.2C1.4 7.9 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.8 3.4 4.5 6.8-1.8 4.8-9.3 9.2-9.3 9.2Z" />
    </svg>
  );

  return (
    <span className={cx("inline-flex w-fit flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={variant === "icon" ? text.label : undefined}
        title={variant === "icon" ? text.label : undefined}
        aria-busy={pending !== null || undefined}
        className={cx(
          "inline-flex items-center justify-center text-foreground transition-colors duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
          ring,
          variant === "icon"
            ? "h-11 w-11 rounded-full bg-background/90 shadow-sm hover:bg-background"
            : "min-h-11 gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pending !== null && "cursor-progress",
        )}
      >
        {heart}
        {variant === "text" && <span>{saved ? text.saved : text.save}</span>}
      </button>
      {failed && variant === "text" && (
        <span aria-hidden="true" className="text-xs text-destructive">
          {text.failed}
        </span>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {message}
      </span>
    </span>
  );
}
