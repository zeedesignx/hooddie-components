"use client";

import * as React from "react";

export interface BackInStockProps {
  /** What is sold out, e.g. "Size XL" or "Bottle green, XL". Shown in the heading and the confirmation. */
  variant?: string;
  /** Saves the request. Return a promise and the form shows "Sending…" until it settles. If it rejects, the form shows `labels.failed` and keeps the email. */
  onSubmit?: (email: string) => void | Promise<void>;
  /** Fills in the email, e.g. for a signed-in shopper. */
  defaultEmail?: string;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    heading?: (variant?: string) => string;
    intro?: string;
    email?: string;
    placeholder?: string;
    submit?: string;
    sending?: string;
    required?: string;
    invalid?: string;
    failed?: string;
    /** The confirmation. Say what happens next. */
    done?: (email: string, variant?: string) => string;
    /** Takes the shopper back to the form. */
    change?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Loose on purpose: catches typos like a missing @ or domain, and leaves the rest to the confirmation email. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** An "Email me when it's back" form for a sold-out size or colour. Validates the address and says what happens next. */
export function BackInStock({ variant, onSubmit, defaultEmail = "", className, labels }: BackInStockProps) {
  const [email, setEmail] = React.useState(defaultEmail);
  const [state, setState] = React.useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const doneRef = React.useRef<HTMLParagraphElement>(null);
  /** What to focus after the next render: the confirmation after sending, the field after "Use a different email". */
  const focusNext = React.useRef<"done" | "input" | null>(null);
  const id = React.useId();
  const text = {
    heading: (name?: string) => (name ? `${name} is sold out` : "Sold out"),
    intro: "Leave your email and we'll tell you when it's back.",
    email: "Email",
    placeholder: "name@example.com",
    submit: "Email me when it's back",
    sending: "Sending…",
    required: "Enter your email address.",
    invalid: "Enter an email address like name@example.com.",
    failed: "That didn't go through. Check your connection and try again.",
    done: (address: string, name?: string) =>
      `We'll email ${address} once, as soon as ${name ? name.charAt(0).toLowerCase() + name.slice(1) : "it"} is back in stock. Nothing else.`,
    change: "Use a different email",
    ...labels,
  };

  React.useEffect(() => {
    if (focusNext.current === "done") doneRef.current?.focus();
    if (focusNext.current === "input") inputRef.current?.focus();
    focusNext.current = null;
  }, [state]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "sending") return;
    const address = email.trim();
    const problem = !address ? text.required : EMAIL.test(address) ? null : text.invalid;
    setError(problem);
    setFailed(false);
    if (problem) {
      inputRef.current?.focus();
      return;
    }
    setState("sending");
    try {
      await onSubmit?.(address);
    } catch {
      setState("idle");
      setFailed(true);
      return;
    }
    focusNext.current = "done";
    setEmail(address);
    setState("done");
  };

  const headingId = `${id}-heading`;
  const errorId = `${id}-error`;

  return (
    <section aria-labelledby={headingId} className={cx("rounded-lg border border-border bg-card p-5 text-card-foreground", className)}>
      <div className="flex items-start gap-3">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        <div className="min-w-0 flex-1">
          <p id={headingId} className="font-semibold">
            {text.heading(variant)}
          </p>
          {state !== "done" && <p className="mt-1 text-sm text-muted-foreground">{text.intro}</p>}
        </div>
      </div>

      {state === "done" ? (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p ref={doneRef} tabIndex={-1} className="flex items-start gap-2 rounded-sm text-sm focus:outline-none">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            <span>{text.done(email, variant)}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              focusNext.current = "input";
              setState("idle");
            }}
            className={cx("-mx-2 inline-flex min-h-8 items-center rounded-sm px-2 text-sm font-medium underline underline-offset-4 hover:no-underline", ring)}
          >
            {text.change}
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={handleSubmit} aria-labelledby={headingId} className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={`${id}-email`} className="text-sm font-medium">
            {text.email}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inputRef}
              id={`${id}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              required
              placeholder={text.placeholder}
              value={email}
              readOnly={state === "sending"}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={cx(
                "min-h-11 w-full min-w-0 flex-1 rounded-md border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground sm:text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                error ? "border-destructive" : "border-border",
              )}
            />
            <button
              type="submit"
              aria-disabled={state === "sending" || undefined}
              aria-busy={state === "sending" || undefined}
              className={cx(
                "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 motion-reduce:transition-none",
                ring,
                state === "sending" && "cursor-progress",
              )}
            >
              {state === "sending" && (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 animate-spin motion-reduce:animate-none">
                  <path d="M12 3a9 9 0 1 0 9 9" />
                </svg>
              )}
              {state === "sending" ? text.sending : text.submit}
            </button>
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {failed && (
            <p role="alert" className="text-sm text-destructive">
              {text.failed}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
