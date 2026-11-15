"use client";

import * as React from "react";

export interface NewsletterSignupProps {
  /** Signs the address up. Return a promise and the button shows "Subscribing…" until it settles. If it throws or rejects, the form shows `labels.error` and keeps the address so the visitor can try again. */
  onSubmit?: (email: string) => void | Promise<void>;
  /** The heading. */
  title?: string;
  /** One line under the heading that says what the visitor gets. */
  description?: string;
  /** "inline" puts the heading beside the form from medium screens and the button beside the field. "stacked" puts everything in one column with a full-width button. Defaults to "inline". */
  layout?: "inline" | "stacked";
  /** Shows a checkbox with `labels.consent` that must be ticked before the form sends. Without it, `labels.consent` is a plain line under the form. */
  requireConsent?: boolean;
  className?: string;
  /** Override the built-in English text. `consent` can hold a link to your privacy policy. */
  labels?: {
    email?: string;
    placeholder?: string;
    submit?: string;
    sending?: string;
    /** Shown in place of the form once the address is in. */
    done?: string;
    /** Shown when `onSubmit` throws or rejects. */
    error?: string;
    /** Shown when the field is empty or the address doesn't look like one. */
    invalid?: string;
    consent?: React.ReactNode;
    /** Shown when the consent box is required and not ticked. */
    consentRequired?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Something, an @, something, a dot, something. The real check is the confirmation email. */
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** An email signup with a consent line and clear sending, done and error states. */
export function NewsletterSignup({ onSubmit, title = "Join our newsletter", description, layout = "inline", requireConsent = false, className, labels }: NewsletterSignupProps) {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "sending" | "done" | "error">("idle");
  const [problem, setProblem] = React.useState<"email" | "consent" | null>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const consentRef = React.useRef<HTMLInputElement>(null);
  const doneRef = React.useRef<HTMLParagraphElement>(null);
  const id = React.useId();
  const text = {
    email: "Email address",
    placeholder: "you@example.com",
    submit: "Subscribe",
    sending: "Subscribing…",
    done: "Thanks for signing up. Check your inbox to confirm your address.",
    error: "We couldn't sign you up just now. Please try again.",
    invalid: "Enter an email address like name@example.com.",
    consent: "We'll email you about new products and offers. Unsubscribe at any time.",
    consentRequired: "Tick the box to agree before subscribing.",
    ...labels,
  };
  const inline = layout === "inline";

  // The form is gone once the address is in, so move focus to the thank-you line instead of losing it.
  React.useEffect(() => {
    if (state === "done") doneRef.current?.focus({ preventScroll: true });
  }, [state]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "sending") return;
    const value = email.trim();
    if (!looksLikeEmail(value)) {
      setProblem("email");
      emailRef.current?.focus();
      return;
    }
    if (requireConsent && !consent) {
      setProblem("consent");
      consentRef.current?.focus();
      return;
    }
    setProblem(null);
    setState("sending");
    try {
      await onSubmit?.(value);
    } catch {
      setState("error");
      return;
    }
    setState("done");
  };

  const emailError = problem === "email";
  const consentError = problem === "consent";

  return (
    <section aria-labelledby={`${id}-title`} className={cx("text-foreground", inline ? "grid gap-5 md:grid-cols-2 md:items-center md:gap-10" : "flex flex-col gap-5", className)}>
      <div>
        <h2 id={`${id}-title`} className="text-xl font-semibold">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>

      {state === "done" ? (
        <p ref={doneRef} tabIndex={-1} role="status" className="flex items-start gap-2 rounded-md text-sm font-medium outline-none">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
          {text.done}
        </p>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor={`${id}-email`} className="sr-only">
            {text.email}
          </label>
          <div className={cx("flex flex-col gap-2", inline && "sm:flex-row")}>
            <input
              ref={emailRef}
              id={`${id}-email`}
              type="email"
              name="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setProblem(null);
                if (state === "error") setState("idle");
              }}
              placeholder={text.placeholder}
              autoComplete="email"
              inputMode="email"
              enterKeyHint="send"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-invalid={emailError || undefined}
              aria-describedby={emailError ? `${id}-email-error` : undefined}
              className={cx(
                "h-12 w-full min-w-0 rounded-md border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground sm:text-sm",
                emailError ? "border-destructive" : "border-border",
                inline && "sm:flex-1",
                ring,
              )}
            />
            <button
              type="submit"
              aria-disabled={state === "sending" || undefined}
              aria-busy={state === "sending" || undefined}
              className={cx(
                "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 motion-reduce:transition-none",
                state === "sending" ? "cursor-progress" : "hover:bg-primary/90",
                ring,
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
          {emailError && (
            <p id={`${id}-email-error`} className="text-sm text-destructive">
              {text.invalid}
            </p>
          )}

          {requireConsent ? (
            <div>
              <div className="flex items-start gap-3">
                <input
                  ref={consentRef}
                  id={`${id}-consent`}
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => {
                    setConsent(event.target.checked);
                    if (consentError) setProblem(null);
                  }}
                  required
                  aria-invalid={consentError || undefined}
                  aria-describedby={consentError ? `${id}-consent-error` : undefined}
                  className={cx("mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-primary", ring)}
                />
                <label htmlFor={`${id}-consent`} className="text-sm text-muted-foreground">
                  {text.consent}
                </label>
              </div>
              {consentError && (
                <p id={`${id}-consent-error`} className="mt-2 text-sm text-destructive">
                  {text.consentRequired}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{text.consent}</p>
          )}

          <p role="alert" className={cx("text-sm text-destructive", state !== "error" && "sr-only")}>
            {state === "error" ? text.error : ""}
          </p>
        </form>
      )}
    </section>
  );
}
