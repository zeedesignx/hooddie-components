"use client";

import * as React from "react";

export interface DeliveryOption {
  id: string;
  /** e.g. "Express". */
  name: string;
  /** A line under the name, e.g. "DHL, tracked" or "Collect from a locker near you". */
  description?: string;
  /** When it arrives, e.g. "3–5 working days" or "Tomorrow". */
  estimate: string;
  /** Price in major units: 4.9 means €4.90. 0 shows "Free". */
  price: number;
  /** Shows the option greyed out and unpickable, e.g. when it doesn't ship to the address. */
  disabled?: boolean;
}

export interface DeliveryOptionsProps {
  options: DeliveryOption[];
  /** The picked option's id. Pass it to control the choice yourself. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Form field name, so the choice is posted with a surrounding form. Defaults to "delivery". */
  name?: string;
  /** Marks the group as required for a surrounding form. */
  required?: boolean;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for the price format. Defaults to "en" so server and browser agree; pass the store's locale. */
  locale?: string;
  className?: string;
  /** Hide the "Delivery" heading but keep it for screen readers, e.g. when the page already has one. */
  hideTitle?: boolean;
  /** Override the built-in English text. */
  labels?: { title?: string; free?: string; unavailable?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

/** Shipping methods as radio cards with the delivery estimate and price. Free options say "Free". Native radios, so arrow keys and forms just work. */
export function DeliveryOptions({
  options,
  value,
  defaultValue,
  onValueChange,
  name = "delivery",
  required = false,
  currency = "EUR",
  locale = "en",
  hideTitle = false,
  className,
  labels,
}: DeliveryOptionsProps) {
  const [valueState, setValueState] = React.useState(defaultValue);
  const picked = value ?? valueState;
  const text = { title: "Delivery", free: "Free", unavailable: "Not available", ...labels };
  const id = React.useId();

  const pick = (next: string) => {
    if (next === picked) return;
    if (value === undefined) setValueState(next);
    onValueChange?.(next);
  };

  return (
    <fieldset className={cx("min-w-0 text-foreground", className)}>
      <legend className={cx("mb-3 text-base font-semibold", hideTitle && "sr-only")}>{text.title}</legend>
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const checked = option.id === picked;
          const disabled = option.disabled === true;
          const key = `${id}-${option.id}`;
          const note = disabled ? [text.unavailable, option.description].filter(Boolean).join(" · ") : option.description;
          return (
            <label
              key={option.id}
              className={cx(
                "relative flex min-h-16 items-start gap-3 rounded-lg border bg-background p-4 transition-colors duration-150 motion-reduce:transition-none",
                checked ? "border-primary" : "border-border",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                !disabled && !checked && "hover:border-foreground",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                disabled={disabled}
                required={required}
                onChange={() => pick(option.id)}
                // The name is the method, estimate and price; the longer line is read as a description.
                aria-labelledby={`${key}-name ${key}-estimate ${key}-price`}
                aria-describedby={note ? `${key}-note` : undefined}
                className="peer sr-only"
              />
              {/* The focus ring and the thicker checked border sit on an overlay, so they follow the native radio's focus. */}
              <span
                aria-hidden="true"
                className={cx(
                  "pointer-events-none absolute -inset-px rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                  checked && "border-2 border-primary",
                )}
              />
              <span aria-hidden="true" className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", checked ? "border-primary" : "border-muted-foreground")}>
                {checked && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span id={`${key}-name`} className="text-sm font-medium">
                    {option.name}
                    <span className="sr-only">, </span>
                  </span>
                  <span id={`${key}-estimate`} className="text-sm text-muted-foreground">
                    {option.estimate}
                    <span className="sr-only">, </span>
                  </span>
                </span>
                <span id={`${key}-price`} className={cx("shrink-0 text-sm font-semibold tabular-nums", option.price === 0 && !disabled && "text-emerald-700")}>
                  {option.price === 0 ? text.free : formatMoney(option.price, currency, locale)}
                </span>
                {note && (
                  <span id={`${key}-note`} className="basis-full text-sm text-muted-foreground">
                    {note}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
