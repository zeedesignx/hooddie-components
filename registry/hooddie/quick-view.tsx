"use client";

import * as React from "react";

export interface QuickViewImage {
  src: string;
  /** Describe what the photo shows, e.g. "Classic Hoodie in bottle green, back". */
  alt: string;
}

export interface QuickViewColour {
  /** Colour name. It is the value, the text after "Colour:" and what screen readers hear. */
  name: string;
  /** Any CSS colour, e.g. "#1F4D3A". */
  color: string;
  /** Photo shown when this colour is picked. */
  image?: string;
}

export interface QuickViewSize {
  value: string;
  /** False crosses the size out. It can't be picked, but it is still announced as sold out. Defaults to true. */
  available?: boolean;
}

export interface QuickViewSelection {
  /** The picked colour's name, or undefined when the product has no colours. */
  colour?: string;
  /** The picked size, or undefined when the product has no sizes. */
  size?: string;
}

export interface QuickViewProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  /** A short line under the title, e.g. "Heavyweight cotton". */
  subtitle?: string;
  /** Price in major units: 59 means €59.00. */
  price: number;
  /** The earlier price. When it is higher than `price`, the dialog shows a sale. */
  compareAtPrice?: number;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for prices. Defaults to "en" so server and browser agree; pass the store's locale. */
  locale?: string;
  /** Photos. The first is shown first; with more than one, thumbnails let the visitor switch. */
  images: QuickViewImage[];
  /** Colour swatches. Picking one with an `image` shows that photo. */
  colours?: QuickViewColour[];
  /** Colour picked when the dialog opens. Defaults to the first colour. */
  defaultColour?: string;
  onColourChange?: (name: string) => void;
  /** Size buttons. When there are sizes, one must be picked before adding to the bag. */
  sizes?: QuickViewSize[];
  defaultSize?: string;
  onSizeChange?: (value: string) => void;
  /** The full product page, linked as "View full details". */
  href: string;
  /** Adds the picked variant. Return a promise and the button shows "Adding…" until it settles. If it throws or rejects, the dialog shows `labels.error`. */
  onAdd?: (selection: QuickViewSelection) => void | Promise<void>;
  /** Shows "Sold out" and blocks the add button. */
  soldOut?: boolean;
  /** Blend the photos into the grey background. Use for packshots on white. */
  blend?: boolean;
  /** Merged onto the full-screen overlay, e.g. to change its `z-50`. */
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    close?: string;
    colour?: string;
    size?: string;
    soldOutSize?: string;
    salePrice?: string;
    regularPrice?: string;
    /** Names the thumbnail buttons: "Show photo 2 of 3". */
    showImage?: (index: number, total: number) => string;
    add?: string;
    adding?: string;
    added?: string;
    soldOut?: string;
    /** Shown when "Add to bag" is pressed before a size is picked. */
    pickSize?: string;
    /** Shown when `onAdd` throws or rejects. */
    error?: string;
    viewDetails?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ringOffset = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** How long "Added to bag" stays on the button, in milliseconds. */
const ADDED_FOR = 2000;

/** Arrow keys move between the options of a group and pick the one they land on, unless it is sold out. */
const onArrowKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
  const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
  if (step === 0) return;
  const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const from = radios.findIndex((radio) => radio === document.activeElement);
  if (from === -1) return;
  event.preventDefault();
  const next = radios[(from + step + radios.length) % radios.length];
  next.focus();
  next.click();
};

/** A product in a dialog, opened from a listing: photos, price, colour and size, and add to bag. Traps focus, closes on Escape and gives focus back to the opener. */
export function QuickView({
  open, defaultOpen = false, onOpenChange, title, subtitle, price, compareAtPrice, currency = "EUR", locale = "en", images,
  colours, defaultColour, onColourChange, sizes, defaultSize, onSizeChange, href, onAdd, soldOut = false, blend = false, className, labels,
}: QuickViewProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  /** In the page. Stays true for 200ms after closing so the dialog can fade out. */
  const [mounted, setMounted] = React.useState(isOpen);
  /** Painted once in its starting position, so the fade in has somewhere to start from. */
  const [entered, setEntered] = React.useState(isOpen);
  const [colour, setColour] = React.useState(defaultColour ?? colours?.[0]?.name);
  const [size, setSize] = React.useState(defaultSize);
  /** The photo on show: one from `images`, or a colour's photo after a colour pick. */
  const [photo, setPhoto] = React.useState<string | undefined>(undefined);
  const [state, setState] = React.useState<"idle" | "busy" | "added" | "error">("idle");
  const [needSize, setNeedSize] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const sizesRef = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Goes up on every reset, so an add that finishes after the dialog moved on doesn't touch the new state. */
  const generation = React.useRef(0);
  const id = React.useId();
  if (isOpen && !mounted) setMounted(true);

  // The dialog stays mounted between openings and may be reused for another product, so every
  // opening, and every change of product, starts again from the defaults.
  const product = `${title}|${href}`;
  const [seen, setSeen] = React.useState({ open: isOpen, product });
  if (seen.open !== isOpen || seen.product !== product) {
    setSeen({ open: isOpen, product });
    if ((isOpen && !seen.open) || seen.product !== product) {
      setColour(defaultColour ?? colours?.[0]?.name);
      setSize(defaultSize);
      setPhoto(undefined);
      setState("idle");
      setNeedSize(false);
      generation.current += 1;
    }
  }

  const text = {
    close: "Close",
    colour: "Colour",
    size: "Size",
    soldOutSize: "sold out",
    salePrice: "Sale price",
    regularPrice: "Regular price",
    showImage: (index: number, total: number) => `Show photo ${index} of ${total}`,
    add: "Add to bag",
    adding: "Adding…",
    added: "Added to bag",
    soldOut: "Sold out",
    pickSize: "Pick a size first.",
    error: "We couldn't add this to your bag. Please try again.",
    viewDetails: "View full details",
    ...labels,
  };
  const visible = isOpen && entered;
  const onSale = compareAtPrice !== undefined && compareAtPrice > price;
  const shownSrc = photo ?? images[0]?.src;
  const shownColour = colours?.find((item) => item.name === colour);
  const shownAlt = images.find((image) => image.src === shownSrc)?.alt ?? (shownColour ? `${title}, ${shownColour.name}` : title);
  // One option per group is in the tab order: the picked one, or else the first that can be picked.
  const sizeStop = sizes?.some((item) => item.value === size) ? size : (sizes?.find((item) => item.available !== false) ?? sizes?.[0])?.value;
  const colourStop = colours?.some((item) => item.name === colour) ? colour : colours?.[0]?.name;

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  React.useEffect(() => {
    if (isOpen) {
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    const close = window.setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, 200);
    return () => window.clearTimeout(close);
  }, [isOpen]);

  // While open: lock page scroll, move focus in, keep it in, and give it back to the opener on close.
  React.useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const body = document.body;
    const active = document.activeElement;
    // Ignore the body and the dialog itself, e.g. when React StrictMode runs this effect twice.
    const opener = active instanceof HTMLElement && !panel?.contains(active) && active !== document.body ? active : null;
    const { overflow, paddingRight } = body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;
    body.style.overflow = "hidden";
    // A dialog that is open on load inside an embed must not pull focus out of the page around it.
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
    if (event.key === "Escape") {
      // An inner control, such as an open list, may already have used this Escape.
      if (event.defaultPrevented) return;
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const panel = event.currentTarget;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.tabIndex >= 0);
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

  const pickColour = (item: QuickViewColour) => {
    if (item.image) setPhoto(item.image);
    if (item.name === colour) return;
    setColour(item.name);
    onColourChange?.(item.name);
  };

  const pickSize = (value: string) => {
    setNeedSize(false);
    if (value === size) return;
    setSize(value);
    onSizeChange?.(value);
  };

  const add = async () => {
    // One add at a time: presses while adding or confirming are ignored.
    if (soldOut || state === "busy" || state === "added") return;
    if (sizes && sizes.length > 0 && !size) {
      setNeedSize(true);
      sizesRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
      return;
    }
    const run = generation.current;
    setState("busy");
    try {
      await onAdd?.({ colour, size });
    } catch {
      if (run === generation.current) setState("error");
      return;
    }
    if (run !== generation.current) return;
    setState("added");
    timer.current = setTimeout(() => setState("idle"), ADDED_FOR);
  };

  if (!mounted) return null;

  return (
    <div aria-hidden={isOpen ? undefined : true} className={cx("fixed inset-0 z-50 flex items-end justify-center overflow-hidden sm:items-center sm:p-6", !isOpen && "pointer-events-none", className)}>
      <div aria-hidden="true" onClick={() => setOpen(false)} className={cx("absolute inset-0 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none", visible ? "opacity-100" : "opacity-0")} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx(
          "relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-xl bg-background text-foreground shadow-xl outline-none transition duration-200 ease-out motion-reduce:transition-none sm:max-h-[calc(100dvh-3rem)] sm:max-w-3xl sm:rounded-xl",
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <button
          type="button"
          aria-label={text.close}
          onClick={() => setOpen(false)}
          className={cx("absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-accent hover:text-accent-foreground", ring)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
        </button>

        <div className="grid md:grid-cols-2">
          <div className="flex flex-col gap-3 p-4 pb-0 md:p-5 md:pr-0">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted md:aspect-[4/5]">
              {shownSrc && <img src={shownSrc} alt={shownAlt} className={cx("absolute inset-0 h-full w-full object-cover object-top", blend && "mix-blend-multiply")} />}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((image, index) => {
                  const current = image.src === shownSrc;
                  return (
                    <button
                      key={image.src}
                      type="button"
                      aria-label={text.showImage(index + 1, images.length)}
                      aria-pressed={current}
                      onClick={() => setPhoto(image.src)}
                      className={cx("h-16 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-muted", current ? "border-foreground" : "border-transparent hover:border-border", ringOffset)}
                    >
                      <img src={image.src} alt="" loading="lazy" className={cx("h-full w-full object-cover object-top", blend && "mix-blend-multiply")} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:p-6 md:pt-14">
            <div>
              <h2 id={`${id}-title`} className="pr-10 text-xl font-semibold md:pr-0">
                {title}
              </h2>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              <p className="mt-3 text-lg font-medium">
                {onSale && <span className="sr-only">{text.salePrice} </span>}
                <span className={cx(onSale && "text-destructive")}>{formatMoney(price, currency, locale)}</span>
                {onSale && (
                  <>
                    <span className="sr-only"> {text.regularPrice} </span>
                    <s className="ml-2 text-base font-normal text-muted-foreground">{formatMoney(compareAtPrice, currency, locale)}</s>
                  </>
                )}
              </p>
            </div>

            {colours && colours.length > 0 && (
              <div className="flex flex-col gap-2">
                <p id={`${id}-colour`} className="text-sm font-medium">
                  {text.colour}
                  {colour && <span className="font-normal text-muted-foreground">: {colour}</span>}
                </p>
                <div role="radiogroup" aria-labelledby={`${id}-colour`} onKeyDown={onArrowKey} className="-m-1.5 flex flex-wrap">
                  {colours.map((item) => {
                    const checked = item.name === colour;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={item.name}
                        title={item.name}
                        tabIndex={item.name === colourStop ? 0 : -1}
                        onClick={() => pickColour(item)}
                        className={cx("flex h-11 w-11 items-center justify-center rounded-full", ring)}
                      >
                        <span style={{ backgroundColor: item.color }} className={cx("h-8 w-8 rounded-full border border-black/10 ring-offset-2 ring-offset-background", checked && "ring-2 ring-foreground")} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sizes && sizes.length > 0 && (
              <div className="flex flex-col gap-2">
                <p id={`${id}-size`} className="text-sm font-medium">
                  {text.size}
                  {size && <span className="font-normal text-muted-foreground">: {size}</span>}
                </p>
                <div
                  ref={sizesRef}
                  role="radiogroup"
                  aria-labelledby={`${id}-size`}
                  aria-describedby={needSize ? `${id}-size-error` : undefined}
                  aria-invalid={needSize || undefined}
                  onKeyDown={onArrowKey}
                  className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2"
                >
                  {sizes.map((item) => {
                    const checked = item.value === size;
                    const sizeSoldOut = item.available === false;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-disabled={sizeSoldOut || undefined}
                        aria-label={sizeSoldOut ? `${item.value}, ${text.soldOutSize}` : undefined}
                        tabIndex={item.value === sizeStop ? 0 : -1}
                        onClick={() => {
                          if (!sizeSoldOut) pickSize(item.value);
                        }}
                        className={cx(
                          "relative flex h-11 items-center justify-center overflow-hidden rounded-md border px-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
                          ringOffset,
                          checked ? "border-primary bg-primary text-primary-foreground" : sizeSoldOut ? "cursor-not-allowed border-border text-muted-foreground" : needSize ? "border-destructive hover:border-foreground" : "border-border hover:border-foreground",
                        )}
                      >
                        {item.value}
                        {sizeSoldOut && (
                          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                            <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
                {needSize && (
                  <p id={`${id}-size-error`} role="alert" className="text-sm text-destructive">
                    {text.pickSize}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={add}
                aria-disabled={soldOut || undefined}
                aria-busy={state === "busy" || undefined}
                className={cx(
                  "flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none",
                  ringOffset,
                  soldOut ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
                  !soldOut && (state === "idle" || state === "error") && "hover:bg-primary/90",
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
              <p role="status" aria-live="polite" className={cx("text-sm", state === "error" ? "text-destructive" : "sr-only")}>
                {state === "added" ? text.added : state === "error" ? text.error : ""}
              </p>
              <a href={href} className={cx("inline-flex min-h-11 items-center gap-1.5 self-start rounded-sm text-sm font-medium underline underline-offset-4 hover:no-underline", ringOffset)}>
                {text.viewDetails}
                <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
