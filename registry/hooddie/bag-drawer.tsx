"use client";

import * as React from "react";

export interface BagDrawerItem {
  id: string;
  title: string;
  /** What was picked, e.g. "Bottle green / M". */
  variant?: string;
  /** Price of one, in major units: 59 means €59.00. The line shows price × quantity. */
  price: number;
  quantity: number;
  image: string;
  /** Product page. Turns the title into a link. */
  href?: string;
  /** Most that can be bought, e.g. what is in stock. The plus button stops there. */
  maxQuantity?: number;
}

export interface BagDrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The lines in the bag. The drawer doesn't keep its own copy: update them in the two callbacks below. */
  items: BagDrawerItem[];
  /** Called with the new quantity. Leave out to show the quantity as plain text. */
  onQuantityChange?: (id: string, quantity: number) => void;
  /** Leave out to hide the "Remove" buttons. */
  onRemove?: (id: string) => void;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for prices and dates. Defaults to "en" so the server and the browser agree; pass your store's locale. */
  locale?: string;
  /** Makes the checkout control a link. Without it, it is a button that calls `onCheckout`. */
  checkoutHref?: string;
  onCheckout?: () => void;
  /** The edge the drawer slides in from. Defaults to "right". */
  side?: "right" | "left";
  /** Rendered between the list and the footer while the bag has items, e.g. a free shipping bar. */
  children?: React.ReactNode;
  /** A line under the subtotal, e.g. "Shipping and taxes at checkout". */
  footerNote?: string;
  /** Merged onto the full-screen overlay, e.g. to change its `z-50`. */
  className?: string;
  /** Override the built-in English text. Item names passed to the functions include the variant. */
  labels?: {
    title?: (count: number) => string;
    close?: string;
    empty?: string;
    keepShopping?: string;
    quantity?: string;
    decrease?: (item: string) => string;
    increase?: (item: string) => string;
    remove?: string;
    removeItem?: (item: string) => string;
    subtotal?: string;
    checkout?: string;
    /** Announced to screen readers after a quantity change. */
    quantityChanged?: (item: string, quantity: number) => string;
    /** Announced to screen readers after a removal. */
    removed?: (item: string) => string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const stepButton = cx("flex h-8 w-8 items-center justify-center rounded-md", ring);
const primaryButton = cx("flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-offset-2 motion-reduce:transition-none", ring);

/** A slide-over bag with line items, quantity controls, subtotal and a checkout control. Traps focus and closes on Escape. */
export function BagDrawer({
  open, defaultOpen = false, onOpenChange, items, onQuantityChange, onRemove, currency = "EUR", locale = "en",
  checkoutHref, onCheckout, side = "right", children, footerNote, className, labels,
}: BagDrawerProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  /** In the page. Stays true for 300ms after closing so the drawer can slide out. */
  const [mounted, setMounted] = React.useState(isOpen);
  /** Painted once in its off-screen position, so the slide in has somewhere to start from. */
  const [entered, setEntered] = React.useState(isOpen);
  const [message, setMessage] = React.useState("");
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  if (isOpen && !mounted) setMounted(true);

  const text = {
    title: (count: number) => `Your bag (${count})`,
    close: "Close bag",
    empty: "Your bag is empty.",
    keepShopping: "Keep shopping",
    quantity: "Quantity",
    decrease: (item: string) => `Decrease quantity of ${item}`,
    increase: (item: string) => `Increase quantity of ${item}`,
    remove: "Remove",
    removeItem: (item: string) => `Remove ${item}`,
    subtotal: "Subtotal",
    checkout: "Checkout",
    quantityChanged: (item: string, quantity: number) => `${item}: quantity ${quantity}`,
    removed: (item: string) => `${item} removed from your bag`,
    ...labels,
  };
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const visible = isOpen && entered;

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  React.useEffect(() => {
    if (isOpen) {
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // While open: lock page scroll, move focus in, keep it in, and give it back to the opener on close.
  React.useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const body = document.body;
    const active = document.activeElement;
    // Ignore focus already inside the drawer (React StrictMode runs this effect twice in development).
    const opener = active instanceof HTMLElement && !panel?.contains(active) && active !== document.body ? active : null;
    const { overflow, paddingRight } = body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;
    body.style.overflow = "hidden";
    // A drawer that is open on load inside an embed must not pull focus out of the page around it.
    if (document.hasFocus()) panel?.focus({ preventScroll: true });
    const keepInside = (event: FocusEvent) => {
      if (panel && event.target instanceof Node && !panel.contains(event.target)) panel.focus({ preventScroll: true });
    };
    document.addEventListener("focusin", keepInside);
    return () => {
      document.removeEventListener("focusin", keepInside);
      body.style.overflow = overflow;
      body.style.paddingRight = paddingRight;
      if (document.hasFocus()) opener?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const panel = event.currentTarget;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first: HTMLElement | undefined = focusable[0];
    const last: HTMLElement | undefined = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!first || !last) event.preventDefault();
    else if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  return (
    <div aria-hidden={isOpen ? undefined : true} className={cx("fixed inset-0 z-50 overflow-hidden", !isOpen && "pointer-events-none", className)}>
      <div aria-hidden="true" onClick={() => setOpen(false)} className={cx("absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none", visible ? "opacity-100" : "opacity-0")} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx(
          "absolute inset-y-0 flex h-full w-full max-w-md flex-col bg-background text-foreground shadow-xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none",
          side === "left" ? "left-0" : "right-0",
          visible ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border py-3 pl-5 pr-3">
          <h2 id={titleId} className="text-lg font-semibold">{text.title(count)}</h2>
          <button type="button" aria-label={text.close} onClick={() => setOpen(false)} className={cx("flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground", ring)}>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </div>
        <p role="status" className="sr-only">{message}</p>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
            <p className="text-muted-foreground">{text.empty}</p>
            <button type="button" onClick={() => setOpen(false)} className={cx("inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:ring-offset-2", ring)}>
              {text.keepShopping}
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto overscroll-contain px-5">
              {items.map((item) => {
                const name = item.variant ? `${item.title}, ${item.variant}` : item.title;
                const atMin = item.quantity <= 1;
                const atMax = item.maxQuantity !== undefined && item.quantity >= item.maxQuantity;
                const change = (quantity: number) => {
                  onQuantityChange?.(item.id, quantity);
                  setMessage(text.quantityChanged(name, quantity));
                };
                return (
                  <li key={item.id} className="flex gap-4 py-5">
                    <img src={item.image} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-md bg-muted object-cover object-top" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium">
                            {item.href ? (
                              <a href={item.href} className={cx("rounded-sm hover:underline", ring)}>
                                {item.title}
                              </a>
                            ) : (
                              item.title
                            )}
                          </h3>
                          {item.variant && <p className="mt-0.5 text-sm text-muted-foreground">{item.variant}</p>}
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums">{formatMoney(item.price * item.quantity, currency, locale)}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                        {onQuantityChange ? (
                          <div role="group" aria-label={text.quantity} className="inline-flex items-center rounded-md border border-border">
                            {/* aria-disabled, not disabled: the button keeps keyboard focus when it reaches its limit. */}
                            <button type="button" aria-label={text.decrease(name)} aria-disabled={atMin} onClick={() => !atMin && change(item.quantity - 1)} className={cx(stepButton, atMin ? "cursor-not-allowed opacity-40" : "hover:bg-accent hover:text-accent-foreground")}>
                              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 8h9" /></svg>
                            </button>
                            <span className="min-w-[2rem] text-center text-sm tabular-nums">{item.quantity}</span>
                            <button type="button" aria-label={text.increase(name)} aria-disabled={atMax} onClick={() => !atMax && change(item.quantity + 1)} className={cx(stepButton, atMax ? "cursor-not-allowed opacity-40" : "hover:bg-accent hover:text-accent-foreground")}>
                              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 8h9M8 3.5v9" /></svg>
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{text.quantity} {item.quantity}</p>
                        )}
                        {onRemove && (
                          <button
                            type="button"
                            aria-label={text.removeItem(name)}
                            onClick={() => {
                              onRemove(item.id);
                              setMessage(text.removed(name));
                              // This button is about to go, so park focus on the drawer instead of losing it.
                              panelRef.current?.focus({ preventScroll: true });
                            }}
                            className={cx("min-h-8 rounded-sm px-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground", ring)}
                          >
                            {text.remove}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {children && <div className="border-t border-border px-5 py-4">{children}</div>}
            <div className="border-t border-border px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              <p className="flex items-baseline justify-between gap-4 text-base font-medium">
                <span>{text.subtotal}</span>
                <span className="tabular-nums">{formatMoney(subtotal, currency, locale)}</span>
              </p>
              {footerNote && <p className="mt-1 text-sm text-muted-foreground">{footerNote}</p>}
              {checkoutHref ? (
                <a href={checkoutHref} onClick={onCheckout} className={cx("mt-4", primaryButton)}>
                  {text.checkout}
                </a>
              ) : (
                <button type="button" onClick={onCheckout} className={cx("mt-4", primaryButton)}>
                  {text.checkout}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
