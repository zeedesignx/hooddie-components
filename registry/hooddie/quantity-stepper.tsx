"use client";

import * as React from "react";

export interface QuantityStepperProps {
  /** The quantity. Pass it to control the stepper yourself. */
  value?: number;
  /** The starting quantity when `value` is not passed. Defaults to 1. */
  defaultValue?: number;
  /** Runs with the new quantity, already kept between `min` and `max`. A typed number arrives on blur or Enter. */
  onValueChange?: (value: number) => void;
  /** The smallest quantity. Defaults to 1. */
  min?: number;
  /** The largest quantity, e.g. the stock left. No limit when left out. */
  max?: number;
  disabled?: boolean;
  /** "md" is 44px tall. "sm" is 36px, for tight places such as a line in the bag. Defaults to "md". */
  size?: "sm" | "md";
  className?: string;
  /** Override the built-in English text. */
  labels?: { decrease?: string; increase?: string; quantity?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/** Minus, a number the visitor can type, plus. Stays between a minimum and a maximum. */
export function QuantityStepper({ value, defaultValue = 1, onValueChange, min = 1, max, disabled = false, size = "md", className, labels }: QuantityStepperProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  // What the visitor is typing, until it is committed on blur or Enter.
  const [draft, setDraft] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const current = value ?? internal;
  const atMin = current <= min;
  const atMax = max !== undefined && current >= max;
  const small = size === "sm";
  const text = { decrease: "Decrease quantity", increase: "Increase quantity", quantity: "Quantity", ...labels };

  const commit = (next: number, announce = false) => {
    const clamped = Math.min(Math.max(next, min), max ?? Infinity);
    setDraft(null);
    // Say the new number after a button press, or when a typed number was pulled back into range.
    if (announce || clamped !== next) setAnnouncement(`${text.quantity}: ${clamped}`);
    if (clamped === current) return;
    if (value === undefined) setInternal(clamped);
    onValueChange?.(clamped);
  };

  const commitDraft = () => {
    if (draft === null) return;
    if (draft === "") setDraft(null);
    else commit(Number(draft));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commitDraft();
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    commit((draft ? Number(draft) : current) + (event.key === "ArrowUp" ? 1 : -1), true);
  };

  const step = (blocked: boolean) =>
    cx(
      "relative flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 motion-reduce:transition-none focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
      small ? "w-9" : "w-11",
      blocked ? "cursor-not-allowed text-muted-foreground opacity-50" : "hover:bg-muted",
    );

  return (
    <div className={cx("relative inline-flex items-stretch rounded-md border border-border bg-background text-foreground", small ? "h-9" : "h-11", disabled && "opacity-50", className)}>
      {/* At a limit the button is aria-disabled, not disabled, so keyboard focus stays on it. */}
      <button
        type="button"
        aria-label={text.decrease}
        aria-disabled={atMin || undefined}
        disabled={disabled}
        onClick={() => {
          if (!atMin) commit(current - 1, true);
        }}
        className={step(atMin)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
          <path d="M5 12h14" />
        </svg>
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={text.quantity}
        disabled={disabled}
        value={draft ?? String(current)}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={(event) => event.target.select()}
        onBlur={commitDraft}
        onKeyDown={onKeyDown}
        className={cx(
          "relative min-w-0 rounded-md border-0 bg-transparent p-0 text-center text-base font-medium tabular-nums text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed md:text-sm",
          small ? "w-10" : "w-12",
        )}
      />
      <button
        type="button"
        aria-label={text.increase}
        aria-disabled={atMax || undefined}
        disabled={disabled}
        onClick={() => {
          if (!atMax) commit(current + 1, true);
        }}
        className={step(atMax)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
          <path d="M5 12h14M12 5v14" />
        </svg>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
