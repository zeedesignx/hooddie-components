"use client";

import * as React from "react";

export interface AddToBagProps {
  /** Adds the product. Return a promise and the button shows "Adding…" until it settles. If it throws or rejects, the button goes back to ready, so show your own error message. */
  onAdd?: () => void | Promise<void>;
  /** Shows "Sold out" and blocks the button. */
  soldOut?: boolean;
  /** Blocks the button without changing its text, e.g. until a size is picked. */
  disabled?: boolean;
  /** Price in major units: 59 means €59.00. Shown after the text when given. */
  price?: number;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for prices and dates. Defaults to "en" so the server and the browser agree; pass your store's locale. */
  locale?: string;
  className?: string;
  /** Override the built-in English text. `added` is shown on the button and read to screen readers. */
  labels?: { add?: string; adding?: string; added?: string; soldOut?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

/** How long "Added to bag" stays on the button, in milliseconds. */
const ADDED_FOR = 2000;

/** The buy button. Shows that it is adding, confirms when the product is in the bag, and has a sold-out state. */
export function AddToBag({ onAdd, soldOut = false, disabled = false, price, currency = "EUR", locale = "en", className, labels }: AddToBagProps) {
  const [state, setState] = React.useState<"idle" | "busy" | "added">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocked = soldOut || disabled;
  const text = { add: "Add to bag", adding: "Adding…", added: "Added to bag", soldOut: "Sold out", ...labels };

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleClick = async () => {
    // One add at a time: presses while adding or confirming are ignored.
    if (blocked || state !== "idle") return;
    setState("busy");
    try {
      await onAdd?.();
    } catch {
      setState("idle");
      return;
    }
    setState("added");
    timer.current = setTimeout(() => setState("idle"), ADDED_FOR);
  };

  return (
    <div className={cx("w-full", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-disabled={blocked || undefined}
        aria-busy={state === "busy" || undefined}
        className={cx(
          "flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          soldOut ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
          !soldOut && disabled && "cursor-not-allowed opacity-50",
          !blocked && state === "idle" && "hover:bg-primary/90",
          !blocked && state === "busy" && "cursor-progress",
        )}
      >
        {soldOut ? (
          text.soldOut
        ) : state === "busy" ? (
          <>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 animate-spin motion-reduce:animate-none">
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
            {text.adding}
          </>
        ) : state === "added" ? (
          <>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            {text.added}
          </>
        ) : (
          <span>
            {text.add}
            {price !== undefined && (
              <>
                {" "}
                <span aria-hidden="true">·</span> {formatMoney(price, currency, locale)}
              </>
            )}
          </span>
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "added" ? text.added : ""}
      </span>
    </div>
  );
}
