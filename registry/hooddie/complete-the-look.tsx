"use client";

import * as React from "react";

export interface CompleteTheLookItem {
  id: string;
  title: string;
  /** Product page. Turns the title into a link. */
  href?: string;
  /** Price in major units: 59 means €59.00. */
  price: number;
  /** The earlier price. When it is higher than `price`, the line shows a sale. */
  compareAtPrice?: number;
  image: string;
  /** What will be added, e.g. "Bottle green / M". */
  variant?: string;
  /** False shows "Sold out", unticks the item and blocks it. Defaults to true. */
  available?: boolean;
}

export interface CompleteTheLookProps {
  /** The product on this page. Listed first, always included and can't be unticked. */
  product: CompleteTheLookItem;
  /** The products that go with it. */
  items: CompleteTheLookItem[];
  /** The ticked ids from `items`. Pass it to control the selection yourself. */
  value?: string[];
  /** The ticked ids when `value` is not passed. Defaults to every available item. */
  defaultValue?: string[];
  onValueChange?: (ids: string[]) => void;
  /** Adds the ticked products, called with the page's product id first. Return a promise to show "Adding…"; reject to show the error. */
  onAdd?: (ids: string[]) => void | Promise<void>;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for the price format. Defaults to "en" so server and browser agree; pass the store's locale. */
  locale?: string;
  /** Blend the photos into the grey background. Use for packshots on white. */
  blend?: boolean;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    title?: string;
    thisItem?: string;
    soldOut?: string;
    salePrice?: string;
    regularPrice?: string;
    total?: string;
    add?: (count: number) => string;
    adding?: string;
    added?: (count: number) => string;
    error?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

/** How long the "Added" confirmation stays on the button, in milliseconds. */
const ADDED_FOR = 2500;

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Products that go with this one, ticked by default, with the running total and one button that adds them all to the bag. */
export function CompleteTheLook({
  product,
  items,
  value,
  defaultValue,
  onValueChange,
  onAdd,
  currency = "EUR",
  locale = "en",
  blend = false,
  className,
  labels,
}: CompleteTheLookProps) {
  const [internal, setInternal] = React.useState<string[]>(() => defaultValue ?? items.filter((item) => item.available !== false).map((item) => item.id));
  const [state, setState] = React.useState<"idle" | "busy" | "added" | "error">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = React.useId();
  const text = {
    title: "Complete the look",
    thisItem: "This item",
    soldOut: "Sold out",
    salePrice: "Sale price",
    regularPrice: "Regular price",
    total: "Total",
    add: (count: number) => (count === 1 ? "Add to bag" : `Add ${count} to bag`),
    adding: "Adding…",
    added: (count: number) => (count === 1 ? "Added to bag" : `${count} added to bag`),
    error: "We couldn't add these to your bag. Please try again.",
    ...labels,
  };

  const picked = (value ?? internal).filter((id) => items.some((item) => item.id === id && item.available !== false));
  const chosen = [product, ...items.filter((item) => picked.includes(item.id))];
  const total = chosen.reduce((sum, item) => sum + item.price, 0);
  const totalBefore = chosen.reduce((sum, item) => sum + Math.max(item.price, item.compareAtPrice ?? 0), 0);
  const [addedCount, setAddedCount] = React.useState(0);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((item) => item !== id) : items.filter((item) => item.id === id || picked.includes(item.id)).map((item) => item.id);
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
    if (state === "error") setState("idle");
  };

  const add = async () => {
    if (state === "busy" || state === "added") return;
    const ids = chosen.map((item) => item.id);
    setState("busy");
    try {
      await onAdd?.(ids);
    } catch {
      setState("error");
      return;
    }
    setAddedCount(ids.length);
    setState("added");
    timer.current = setTimeout(() => setState("idle"), ADDED_FOR);
  };

  const all = [product, ...items];

  return (
    <section aria-labelledby={titleId} className={cx("flex flex-col gap-5 text-foreground", className)}>
      <h2 id={titleId} className="text-lg font-semibold">{text.title}</h2>

      <div aria-hidden="true" className="flex items-center gap-2 sm:gap-3">
        {all.map((item, i) => {
          const on = i === 0 || picked.includes(item.id);
          return (
            <React.Fragment key={item.id}>
              {i > 0 && (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4 shrink-0 text-muted-foreground">
                  <path d="M3 8h10M8 3v10" />
                </svg>
              )}
              <div className={cx("aspect-[4/5] w-full min-w-0 max-w-[7.5rem] overflow-hidden rounded-md bg-muted transition-opacity duration-200 motion-reduce:transition-none", !on && "opacity-30")}>
                <img src={item.image} alt="" loading="lazy" className={cx("h-full w-full object-cover object-top", blend && "mix-blend-multiply dark:mix-blend-normal")} />
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {all.map((item, i) => {
          const locked = i === 0;
          const soldOut = !locked && item.available === false;
          const checked = locked || picked.includes(item.id);
          const onSale = item.compareAtPrice !== undefined && item.compareAtPrice > item.price;
          const nameId = `${titleId}-${i}`;
          return (
            <li key={item.id} className="flex items-start gap-1 py-2">
              {locked ? (
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="m3.5 8.5 3 3 6-7" />
                    </svg>
                  </span>
                </span>
              ) : (
                // The label only widens the tap target to 44px; the name comes from the product line beside it.
                <label className={cx("flex h-11 w-11 shrink-0 items-center justify-center", soldOut ? "cursor-not-allowed" : "cursor-pointer")}>
                  <input
                    type="checkbox"
                    aria-labelledby={nameId}
                    checked={checked && !soldOut}
                    disabled={soldOut}
                    onChange={() => toggle(item.id)}
                    className={cx("h-5 w-5 cursor-pointer accent-primary disabled:cursor-not-allowed", ring)}
                  />
                </label>
              )}
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3 py-2.5">
                <p id={nameId} className={cx("min-w-0 text-sm", soldOut && "text-muted-foreground")}>
                  {locked && <span className="font-semibold">{text.thisItem}: </span>}
                  {item.href ? (
                    <a href={item.href} className={cx("rounded-sm font-medium underline-offset-4 hover:underline", ring)}>
                      {item.title}
                    </a>
                  ) : (
                    <span className="font-medium">{item.title}</span>
                  )}
                  {(item.variant || soldOut) && " "}
                  {(item.variant || soldOut) && (
                    <span className="mt-0.5 block text-muted-foreground">
                      {[item.variant, soldOut ? text.soldOut : undefined].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </p>
                <p className="shrink-0 text-right text-sm font-medium tabular-nums">
                  {onSale && <span className="sr-only">{text.salePrice} </span>}
                  <span className={cx(onSale && "text-destructive")}>{formatMoney(item.price, currency, locale)}</span>
                  {onSale && (
                    <>
                      <span className="sr-only"> {text.regularPrice} </span>
                      <s className="ml-2 font-normal text-muted-foreground">{formatMoney(item.compareAtPrice as number, currency, locale)}</s>
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="flex items-baseline gap-2 text-base">
          <span>{text.total}</span>
          <span className="font-semibold tabular-nums">{formatMoney(total, currency, locale)}</span>
          {totalBefore > total && (
            <>
              <span className="sr-only">{text.regularPrice}</span>
              <s className="text-sm text-muted-foreground tabular-nums">{formatMoney(totalBefore, currency, locale)}</s>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={add}
          aria-busy={state === "busy" || undefined}
          className={cx(
            "flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 motion-reduce:transition-none sm:min-w-[12rem]",
            state === "idle" || state === "error" ? "hover:bg-primary/90" : state === "busy" ? "cursor-progress" : "",
            ring,
          )}
        >
          {state === "busy" ? (
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
              {text.added(addedCount)}
            </>
          ) : (
            text.add(chosen.length)
          )}
        </button>
      </div>
      <p role="status" className={cx("text-sm", state === "error" ? "text-destructive" : "sr-only")}>
        {state === "error" ? text.error : state === "added" ? text.added(addedCount) : ""}
      </p>
    </section>
  );
}
