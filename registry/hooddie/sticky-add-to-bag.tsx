"use client";

import * as React from "react";

export interface StickyAddToBagProps {
  /**
   * The `id` of the page's main buy button. The bar slides up once that element has scrolled up out of view and
   * hides again when it is back. Leave out and control the bar with `visible` instead.
   */
  watchId?: string;
  /** Shows or hides the bar, overriding the watched element. Pair with `onVisibleChange`. */
  visible?: boolean;
  /** Start shown when uncontrolled. The watched element takes over once it first scrolls in or out of view. Mostly for previews. */
  defaultVisible?: boolean;
  /** Called when the watched element says the bar should show or hide. */
  onVisibleChange?: (visible: boolean) => void;
  title: string;
  /** What was picked, e.g. "Bottle green · M". */
  variant?: string;
  /** Price in major units: 59 means €59.00. */
  price: number;
  /** The earlier price. When it is higher than `price`, the bar shows a sale. */
  compareAtPrice?: number;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for the price format. Defaults to "en" so server and browser agree; pass the store's locale. */
  locale?: string;
  /** Small product photo, shown from the `sm` breakpoint up. Decorative: the title says what it is. */
  image?: string;
  /** Blend the photo into the grey background. Use for packshots on white. */
  blend?: boolean;
  /** Adds the product. Return a promise and the button shows "Adding…" until it settles. If it rejects, the button goes back to ready, so show your own error. */
  onAdd?: () => void | Promise<void>;
  /** Shows "Sold out" and blocks the button. */
  soldOut?: boolean;
  /** Merged onto the fixed bar, e.g. to change its `z-40`. The bar covers the bottom of the page while shown, so leave room under your footer. */
  className?: string;
  /** Override the built-in English text. `region` names the bar and `announce` is read out after adding, both for screen readers. */
  labels?: {
    region?: string;
    add?: string;
    adding?: string;
    added?: string;
    soldOut?: string;
    salePrice?: string;
    regularPrice?: string;
    announce?: (title: string) => string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

/** How long "Added" stays on the button, in milliseconds. */
const ADDED_FOR = 2000;

/** A bar fixed to the bottom of the screen with the product, price and buy button. It shows once the main buy button scrolls out of view. */
export function StickyAddToBag({
  watchId, visible, defaultVisible = false, onVisibleChange, title, variant, price, compareAtPrice, currency = "EUR", locale = "en",
  image, blend = false, onAdd, soldOut = false, className, labels,
}: StickyAddToBagProps) {
  const [internal, setInternal] = React.useState(defaultVisible);
  const [state, setState] = React.useState<"idle" | "busy" | "added">("idle");
  const shown = visible ?? internal;
  const barRef = React.useRef<HTMLElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The observer's first report says where the button starts. With `defaultVisible` it is skipped so the bar stays up. */
  const skipFirst = React.useRef(defaultVisible);
  const report = React.useRef(onVisibleChange);
  const controlled = visible !== undefined;
  const onSale = compareAtPrice !== undefined && compareAtPrice > price;
  const text = {
    region: "Quick add to bag",
    add: "Add to bag",
    adding: "Adding…",
    added: "Added",
    soldOut: "Sold out",
    salePrice: "Sale price",
    regularPrice: "Regular price",
    announce: (name: string) => `${name} added to your bag`,
    ...labels,
  };

  React.useEffect(() => {
    report.current = onVisibleChange;
  });

  React.useEffect(() => {
    if (!watchId || typeof IntersectionObserver === "undefined") return;
    const target = document.getElementById(watchId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (skipFirst.current) {
        skipFirst.current = false;
        return;
      }
      // Show only once the button is above the screen, not while it is still below it.
      const past = !entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0);
      if (!controlled) setInternal(past);
      report.current?.(past);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId, controlled]);

  // Hidden means gone: not focusable, not read out. If focus was in the bar, hand it back to the main button.
  React.useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.toggleAttribute("inert", !shown);
    if (!shown && bar.contains(document.activeElement)) {
      (watchId ? document.getElementById(watchId) : null)?.focus({ preventScroll: true });
    }
  }, [shown, watchId]);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleAdd = async () => {
    if (soldOut || state !== "idle") return;
    setState("busy");
    try {
      await onAdd?.();
    } catch {
      setState("idle");
      return;
    }
    setState("added");
    timer.current = setTimeout(() => setState("idle"), ADDED_FOR);
  };

  return (
    <section
      ref={barRef}
      aria-label={text.region}
      aria-hidden={!shown || undefined}
      className={cx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background text-foreground shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none",
        shown ? "visible translate-y-0" : "invisible translate-y-full",
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        {image && (
          <span className="hidden h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
            <img src={image} alt="" className={cx("h-full w-full object-cover object-top", blend && "mix-blend-multiply dark:mix-blend-normal")} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="flex min-w-0 items-baseline gap-x-2 text-sm">
            {variant && (
              <>
                <span className="truncate text-muted-foreground">{variant}</span>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
              </>
            )}
            <span className="shrink-0 whitespace-nowrap font-medium">
              {onSale && <span className="sr-only">{text.salePrice} </span>}
              <span className={cx(onSale && "text-destructive")}>{formatMoney(price, currency, locale)}</span>
              {onSale && (
                <>
                  <span className="sr-only"> {text.regularPrice} </span>
                  <s className="ml-1.5 font-normal text-muted-foreground">{formatMoney(compareAtPrice, currency, locale)}</s>
                </>
              )}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          aria-disabled={soldOut || undefined}
          aria-busy={state === "busy" || undefined}
          className={cx(
            "flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-40 sm:px-6",
            soldOut ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
            !soldOut && state === "idle" && "hover:bg-primary/90",
            !soldOut && state === "busy" && "cursor-progress",
          )}
        >
          {soldOut ? (
            text.soldOut
          ) : state === "busy" ? (
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
              {text.added}
            </>
          ) : (
            text.add
          )}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {state === "added" ? text.announce(title) : ""}
        </span>
      </div>
    </section>
  );
}
