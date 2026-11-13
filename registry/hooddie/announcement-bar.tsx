"use client";

import * as React from "react";

export interface AnnouncementBarProps {
  /** The message. Keep it to one short line. */
  children: React.ReactNode;
  /** Where the link goes. With no `linkLabel`, the whole message becomes the link. */
  href?: string;
  /** Link text shown after the message, e.g. "See details". */
  linkLabel?: string;
  /** Show a close button. Defaults to true. */
  dismissible?: boolean;
  /** Remember the dismissal in localStorage under this key. Change the key when the message changes, so the new one shows. */
  storageKey?: string;
  onDismiss?: () => void;
  className?: string;
  /** Override the built-in English text. `region` names the bar for screen readers. */
  labels?: { region?: string; dismiss?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/** Storage can be missing (server) or blocked (private mode, strict settings). Then the bar simply forgets. */
const wasDismissed = (key: string) => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const rememberDismissal = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Nothing to do: the bar comes back on the next visit.
  }
};

/** A strip across the top of the store for one message, with an optional link and a close button. */
export function AnnouncementBar({ children, href, linkLabel, dismissible = true, storageKey, onDismiss, className, labels }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const text = { region: "Announcement", dismiss: "Dismiss announcement", ...labels };

  // Read after mount, not during render, so the server and the browser render the same HTML.
  React.useEffect(() => {
    if (dismissible && storageKey && wasDismissed(storageKey)) setDismissed(true);
  }, [dismissible, storageKey]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    if (storageKey) rememberDismissal(storageKey);
    onDismiss?.();
  };

  const link = "rounded-sm font-medium underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground";

  return (
    <div role="region" aria-label={text.region} className={cx("relative w-full bg-primary text-primary-foreground", className)}>
      {/* The same padding on both sides keeps the message centred when the close button is there. */}
      <p className={cx("py-2.5 text-center text-sm", dismissible ? "px-12" : "px-4")}>
        {href && !linkLabel ? (
          <a href={href} className={link}>
            {children}
          </a>
        ) : (
          children
        )}
        {href && linkLabel && (
          <>
            {" "}
            <a href={href} className={cx(link, "whitespace-nowrap")}>
              {linkLabel}
            </a>
          </>
        )}
      </p>
      {dismissible && (
        <button
          type="button"
          aria-label={text.dismiss}
          onClick={dismiss}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md transition-opacity duration-150 motion-reduce:transition-none hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
