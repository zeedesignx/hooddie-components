import * as React from "react";

export interface CheckoutStep {
  /** e.g. "Delivery". */
  label: string;
  /** Where the step lives. Finished steps with an `href` become links back to them. */
  href?: string;
}

export interface CheckoutStepsProps {
  steps: CheckoutStep[];
  /** Index of the step the shopper is on, starting at 0. Steps before it count as done. */
  current: number;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    /** Name of the navigation landmark. */
    nav?: string;
    /** The phone summary, e.g. "Step 2 of 4". */
    progress?: (step: number, total: number) => string;
    /** Read after a finished step's name. */
    done?: string;
    /** The phone link back to the previous step. */
    back?: (label: string) => string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const Check = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Where the shopper is in checkout. Finished steps link back, the current one is marked, and phones get a compact "Step 2 of 4" line with a bar. */
export function CheckoutSteps({ steps, current, className, labels }: CheckoutStepsProps) {
  const text = {
    nav: "Checkout progress",
    progress: (step: number, total: number) => `Step ${step} of ${total}`,
    done: "completed",
    back: (label: string) => `Back to ${label}`,
    ...labels,
  };
  const total = steps.length;
  const index = Math.min(Math.max(current, 0), Math.max(total - 1, 0));
  const step = steps[index];
  const previous = index > 0 ? steps[index - 1] : undefined;
  if (!step) return null;

  return (
    <nav aria-label={text.nav} className={cx("w-full text-foreground", className)}>
      {/* Phones: one line and a bar. */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm" aria-current="step">
            <span className="text-muted-foreground">{text.progress(index + 1, total)}:</span> <span className="font-semibold">{step.label}</span>
          </p>
          {previous?.href && (
            <a href={previous.href} className={cx("-my-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-sm underline underline-offset-4 hover:no-underline", ring)}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="m15 6-6 6 6 6" />
              </svg>
              {text.back(previous.label)}
            </a>
          )}
        </div>
        <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* From sm up: every step in a row. */}
      <ol className="hidden items-center gap-3 sm:flex">
        {steps.map((item, i) => {
          const done = i < index;
          const isCurrent = i === index;
          const marker = (
            <span
              aria-hidden="true"
              className={cx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                done || isCurrent ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
          );
          return (
            <li key={`${i}-${item.label}`} className={cx("flex min-w-0 items-center gap-3", i < total - 1 && "flex-1")}>
              {done && item.href ? (
                <a href={item.href} className={cx("group inline-flex min-h-11 min-w-0 items-center gap-2 rounded-sm text-sm font-medium", ring)}>
                  {marker}
                  <span className="truncate group-hover:underline group-hover:underline-offset-4">{item.label}</span>
                  <span className="sr-only">, {text.done}</span>
                </a>
              ) : (
                <span aria-current={isCurrent ? "step" : undefined} className={cx("inline-flex min-h-11 min-w-0 items-center gap-2 text-sm", isCurrent ? "font-semibold" : done ? "font-medium" : "text-muted-foreground")}>
                  {marker}
                  <span className="truncate">{item.label}</span>
                  {done && <span className="sr-only">, {text.done}</span>}
                </span>
              )}
              {i < total - 1 && <span aria-hidden="true" className={cx("h-px min-w-4 flex-1", done ? "bg-primary" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
