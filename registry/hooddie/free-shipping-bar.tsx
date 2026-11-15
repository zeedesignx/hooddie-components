export interface FreeShippingBarProps {
  /** What is in the bag so far, in major units: 68 means €68.00. */
  subtotal: number;
  /** The spend that unlocks free shipping, in the same units. */
  threshold: number;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for prices and dates. Defaults to "en" so the server and the browser agree; pass your store's locale. */
  locale?: string;
  className?: string;
  /** Override the built-in English text. `remaining` gets the formatted amount still to spend. */
  labels?: {
    remaining?: (amount: string) => string;
    reached?: string;
    /** Name of the progress bar for screen readers. Defaults to "Free shipping". */
    progress?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

/** A progress bar that says how much more to spend for free shipping, and when it's reached. */
export function FreeShippingBar({ subtotal, threshold, currency = "EUR", locale = "en", className, labels }: FreeShippingBarProps) {
  const text = {
    remaining: (amount: string) => `Add ${amount} more for free shipping`,
    reached: "You've got free shipping",
    progress: "Free shipping",
    ...labels,
  };
  const remaining = Math.max(threshold - subtotal, 0);
  const reached = remaining === 0;
  const percent = reached ? 100 : Math.min(Math.max((subtotal / threshold) * 100, 0), 100);
  // Round to cents so floating point sums such as 79.99999 don't show up in the sentence.
  const sentence = reached ? text.reached : text.remaining(formatMoney(Math.round(remaining * 100) / 100, currency, locale));

  return (
    <div className={cx("flex flex-col gap-2 text-foreground", className)}>
      <p className={cx("flex items-center gap-1.5 text-sm", reached && "font-medium text-emerald-700 dark:text-emerald-400")}>
        {reached && (
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3.5 3.5L13 4.5" />
          </svg>
        )}
        {sentence}
      </p>
      <div
        role="progressbar"
        aria-label={text.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={sentence}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div style={{ width: `${percent}%` }} className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" />
      </div>
    </div>
  );
}
