"use client";

import * as React from "react";

export interface LoadMoreProps {
  /** How many products are on the page now. */
  shown: number;
  /** How many products the listing has in all. */
  total: number;
  /** Loads the next batch and raises `shown`. Return a promise and the button shows "Loading…" until it settles; if it rejects, an error and a retry are shown. */
  onLoadMore?: () => void | Promise<void>;
  /** Shows the busy state from outside, e.g. while your data hook is fetching. */
  loading?: boolean;
  /** The URL of the next page, e.g. "?page=3". Makes the button a real link, so it works before JavaScript loads and search engines can follow it. With `onLoadMore`, clicks stay on the page. */
  nextHref?: string;
  /** Locale for the numbers. Defaults to "en" so server and browser agree; pass the store's locale. */
  locale?: string;
  className?: string;
  /** Override the built-in English text. The functions get the numbers already formatted. */
  labels?: {
    showing?: (shown: string, total: string) => string;
    allShown?: (total: string) => string;
    loadMore?: string;
    loading?: string;
    error?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The foot of a product listing: how many products are shown out of how many, a progress line, and a button for the next batch. */
export function LoadMore({ shown, total, onLoadMore, loading = false, nextHref, locale = "en", className, labels }: LoadMoreProps) {
  const [state, setState] = React.useState<"idle" | "busy" | "error">("idle");
  const statusRef = React.useRef<HTMLParagraphElement>(null);
  const buttonRef = React.useRef<HTMLElement | null>(null);
  const textId = React.useId();
  const text = {
    showing: (s: string, t: string) => `Showing ${s} of ${t} products`,
    allShown: (t: string) => `You've seen all ${t} products`,
    loadMore: "Load more",
    loading: "Loading…",
    error: "Couldn't load more products. Try again.",
    ...labels,
  };
  const count = Math.min(Math.max(shown, 0), total);
  const done = count >= total;
  const busy = loading || state === "busy";
  const number = new Intl.NumberFormat(locale);
  const percent = total > 0 ? (count / total) * 100 : 100;

  // When the last batch arrives the button goes away. If it had focus, hand focus to the message that replaces it.
  const hadFocus = React.useRef(false);
  React.useEffect(() => {
    if (done && hadFocus.current) statusRef.current?.focus();
    hadFocus.current = false;
  }, [done]);

  const handleClick = async (event: React.MouseEvent) => {
    if (onLoadMore) event.preventDefault();
    if (busy || done || !onLoadMore) return;
    hadFocus.current = document.activeElement === buttonRef.current;
    setState("busy");
    try {
      await onLoadMore();
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const content = busy ? (
    <>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 animate-spin motion-reduce:animate-none">
        <path d="M12 3a9 9 0 1 0 9 9" />
      </svg>
      {text.loading}
    </>
  ) : (
    text.loadMore
  );
  const buttonClass = cx(
    "inline-flex min-h-11 min-w-44 items-center justify-center gap-2 rounded-md border border-border bg-background px-6 py-2.5 text-sm font-semibold text-foreground transition-colors duration-150 motion-reduce:transition-none",
    ring,
    busy ? "cursor-progress" : "hover:bg-accent hover:text-accent-foreground",
  );

  return (
    <div className={cx("flex flex-col items-center gap-4 text-center text-foreground", className)}>
      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <p ref={statusRef} id={textId} tabIndex={-1} aria-live="polite" className="rounded-sm text-sm text-muted-foreground focus:outline-none">
          {done ? text.allShown(number.format(total)) : text.showing(number.format(count), number.format(total))}
        </p>
        <div role="progressbar" aria-labelledby={textId} aria-valuemin={0} aria-valuemax={total} aria-valuenow={count} className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {!done &&
          (nextHref ? (
            <a
              ref={(node) => {
                buttonRef.current = node;
              }}
              href={nextHref}
              onClick={handleClick}
              aria-disabled={busy || undefined}
              aria-busy={busy || undefined}
              className={buttonClass}
            >
              {content}
            </a>
          ) : (
            <button
              ref={(node) => {
                buttonRef.current = node;
              }}
              type="button"
              onClick={handleClick}
              aria-disabled={busy || undefined}
              aria-busy={busy || undefined}
              className={buttonClass}
            >
              {content}
            </button>
          ))}

        {/* Always in the page, so screen readers pick up the error when it is written in. */}
        <p role="alert" className="text-sm text-destructive">
          {state === "error" ? text.error : ""}
        </p>
      </div>
    </div>
  );
}
