"use client";

import * as React from "react";

export interface DiscountCodeApplied {
  /** The code as shown on the chip, e.g. "HOODIE10". */
  code: string;
  /** What the code does, e.g. "10% off". Shown next to the code. */
  description?: string;
}

/**
 * What `onApply` returns or resolves to. Nothing, `true` or `{ description }` means the code worked.
 * A string is the error to show, e.g. "This code has expired". `false` shows the generic `labels.invalid`.
 */
export type DiscountCodeResult = void | boolean | string | { description?: string };

export interface DiscountCodeProps {
  /** Checks the code, already trimmed and uppercased. Return a promise and the button shows "Applying…" until it settles. If it throws, `labels.failed` is shown. */
  onApply: (code: string) => DiscountCodeResult | Promise<DiscountCodeResult>;
  /** Called when a chip's remove button is pressed, and for the old code when a new one replaces it. Return a promise and the chip waits for it; if it throws, the code stays. */
  onRemove?: (code: string) => void | Promise<void>;
  /** The applied codes. Pass them to control the list yourself, and update them in `onCodesChange`. */
  codes?: DiscountCodeApplied[];
  defaultCodes?: DiscountCodeApplied[];
  /** Called with the new list after a code is applied or removed. */
  onCodesChange?: (codes: DiscountCodeApplied[]) => void;
  /** Allow several codes at once. Without it, a new code replaces the applied one (after `onApply` succeeds, `onRemove` runs for the old one). */
  multiple?: boolean;
  /** Whether the field is shown. It is collapsed behind "Have a discount code?" by default. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    toggle?: string;
    field?: string;
    placeholder?: string;
    apply?: string;
    applying?: string;
    appliedCodes?: string;
    remove?: (code: string) => string;
    /** Shown when Apply is pressed with an empty field. */
    empty?: string;
    /** Shown when `onApply` returns `false`. */
    invalid?: string;
    duplicate?: string;
    /** Shown when `onApply` throws, e.g. the network is down. */
    failed?: string;
    removeFailed?: (code: string) => string;
    /** Announced to screen readers. */
    applied?: (code: string, description?: string) => string;
    /** Announced to screen readers. */
    removed?: (code: string) => string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Trims and uppercases, so " hoodie10 " and "HOODIE10" are the same code. */
const normalize = (raw: string) => raw.trim().toUpperCase();

const Spinner = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 animate-spin motion-reduce:animate-none">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

/** A discount code field for the bag or checkout. Collapsed by default, shows applied codes as removable chips and explains why a code didn't work. */
export function DiscountCode({
  onApply,
  onRemove,
  codes,
  defaultCodes = [],
  onCodesChange,
  multiple = false,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  labels,
}: DiscountCodeProps) {
  const text = {
    toggle: "Have a discount code?",
    field: "Discount code",
    placeholder: "Discount code",
    apply: "Apply",
    applying: "Applying…",
    appliedCodes: "Applied discount codes",
    remove: (code: string) => `Remove ${code}`,
    empty: "Enter a discount code.",
    invalid: "This code isn't valid.",
    duplicate: "This code is already applied.",
    failed: "We couldn't check this code. Try again.",
    removeFailed: (code: string) => `We couldn't remove ${code}. Try again.`,
    applied: (code: string, description?: string) => `${code} applied${description ? `: ${description}` : ""}`,
    removed: (code: string) => `${code} removed`,
    ...labels,
  };

  const [codesState, setCodesState] = React.useState(defaultCodes);
  const [openState, setOpenState] = React.useState(defaultOpen);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [removing, setRemoving] = React.useState<string | null>(null);
  const applied = codes ?? codesState;
  const isOpen = open ?? openState;
  // The latest list, read after an await so a slow request never writes back a stale copy.
  const latest = React.useRef(applied);
  latest.current = applied;
  // One request at a time: no removing while a code is being applied, and the other way round.
  const pending = React.useRef(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const focusInput = React.useRef(false);
  const id = React.useId();
  const panelId = `${id}-panel`;
  const inputId = `${id}-input`;
  const errorId = `${id}-error`;

  // Focus the field when the shopper opens it, not when it starts open.
  React.useEffect(() => {
    if (isOpen && focusInput.current) inputRef.current?.focus();
    focusInput.current = false;
  }, [isOpen]);

  const setOpen = (next: boolean) => {
    if (open === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  const setCodes = (next: DiscountCodeApplied[]) => {
    latest.current = next;
    if (codes === undefined) setCodesState(next);
    onCodesChange?.(next);
  };

  const apply = async () => {
    if (pending.current) return;
    const code = normalize(input);
    setNotice("");
    if (!code) {
      setError(text.empty);
      inputRef.current?.focus();
      return;
    }
    if (applied.some((item) => item.code === code)) {
      setError(text.duplicate);
      return;
    }
    setError("");
    pending.current = true;
    setBusy(true);
    let result: DiscountCodeResult;
    try {
      result = await onApply(code);
    } catch {
      setError(text.failed);
      pending.current = false;
      setBusy(false);
      return;
    }
    if (result === false || typeof result === "string") {
      setError(typeof result === "string" && result ? result : text.invalid);
      pending.current = false;
      setBusy(false);
      return;
    }
    const description = typeof result === "object" && result ? result.description : undefined;
    // Without `multiple` the new code replaces the old ones: remove them through `onRemove` too, so the store stays in sync.
    const kept: DiscountCodeApplied[] = [];
    if (!multiple) {
      for (const old of latest.current) {
        try {
          await onRemove?.(old.code);
        } catch {
          kept.push(old);
          setNotice(text.removeFailed(old.code));
        }
      }
    }
    setCodes([...(multiple ? latest.current : kept), { code, description }]);
    setInput("");
    setStatus(text.applied(code, description));
    pending.current = false;
    setBusy(false);
  };

  const remove = async (code: string) => {
    if (pending.current) return;
    pending.current = true;
    setRemoving(code);
    setNotice("");
    setError("");
    try {
      await onRemove?.(code);
    } catch {
      pending.current = false;
      setRemoving(null);
      setNotice(text.removeFailed(code));
      return;
    }
    pending.current = false;
    setRemoving(null);
    setCodes(latest.current.filter((item) => item.code !== code));
    setStatus(text.removed(code));
    // The pressed button is gone: put focus somewhere that makes sense.
    (isOpen ? inputRef.current : toggleRef.current)?.focus();
  };

  return (
    <div className={cx("flex flex-col gap-3 text-foreground", className)}>
      {applied.length > 0 && (
        <ul aria-label={text.appliedCodes} className="flex flex-wrap gap-2">
          {applied.map((item) => (
            <li key={item.code} className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-md bg-secondary py-1 pl-3 pr-1 text-sm text-secondary-foreground">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
                <circle cx="7.5" cy="7.5" r="1.5" />
              </svg>
              <span className="min-w-0">
                <span className="font-semibold tracking-wide">{item.code}</span>
                {item.description && <span> · {item.description}</span>}
              </span>
              <button
                type="button"
                onClick={() => remove(item.code)}
                aria-label={text.remove(item.code)}
                aria-busy={removing === item.code || undefined}
                aria-disabled={(busy || (removing !== null && removing !== item.code)) || undefined}
                className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-sm hover:bg-background/60", ring, removing === item.code && "cursor-progress opacity-60", busy && "cursor-progress")}
              >
                {removing === item.code ? (
                  <Spinner />
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {notice && <p className="text-sm text-destructive">{notice}</p>}

      <div>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => {
            focusInput.current = !isOpen;
            setOpen(!isOpen);
          }}
          className={cx("-mx-1 flex min-h-11 w-[calc(100%+0.5rem)] items-center justify-between gap-3 rounded-sm px-1 text-left text-sm font-medium hover:underline hover:underline-offset-4", ring)}
        >
          {text.toggle}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cx("h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-180")}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div id={panelId} hidden={!isOpen} className="pt-1">
          <label htmlFor={inputId} className="sr-only">
            {text.field}
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              name="discount"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                // Enter applies the code instead of submitting a surrounding checkout form.
                if (event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
              }}
              placeholder={text.placeholder}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={cx(
                "h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-base uppercase text-foreground placeholder:normal-case placeholder:text-muted-foreground md:text-sm",
                error ? "border-destructive" : "border-border",
                ring,
              )}
            />
            <button
              type="button"
              onClick={apply}
              aria-busy={busy || undefined}
              aria-disabled={removing !== null || undefined}
              className={cx(
                "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-150 motion-reduce:transition-none focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                ring,
                busy ? "cursor-progress" : "hover:bg-primary/90",
              )}
            >
              {busy && <Spinner />}
              {busy ? text.applying : text.apply}
            </button>
          </div>
          {error && (
            <p id={errorId} className="mt-2 flex items-start gap-1.5 text-sm text-destructive">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5M12 16.2v.3" />
              </svg>
              {error}
            </p>
          )}
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {error || notice || status}
      </p>
    </div>
  );
}
