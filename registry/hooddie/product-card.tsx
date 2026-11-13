"use client";

import * as React from "react";

export interface ProductCardSwatch {
  /** Colour name. Read to screen readers and shown as a tooltip. */
  name: string;
  /** Any CSS colour, e.g. "#1F4D3A". */
  color: string;
  /** Photo shown when this colour is picked. */
  image?: string;
  /** Second photo for this colour, shown on hover. */
  hoverImage?: string;
}

export interface ProductCardProps {
  /** Where the card links to. */
  href: string;
  title: string;
  /** A short line under the title, e.g. "Heavyweight cotton". */
  subtitle?: string;
  /** Price in major units: 59 means €59.00. */
  price: number;
  /** The earlier price. When it is higher than `price`, the card shows a sale. */
  compareAtPrice?: number;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for prices and dates. Defaults to "en" so the server and the browser agree; pass your store's locale. */
  locale?: string;
  image: string;
  /** Second photo shown on hover, e.g. the back. */
  hoverImage?: string;
  /** Alt text for the photo. Defaults to the title. */
  imageAlt?: string;
  /** Short label over the photo, such as "New". */
  badge?: string;
  /** Colour dots under the photo. Picking one swaps the photo. */
  swatches?: ProductCardSwatch[];
  /** Blend the photo into the grey background. Use for packshots on white. */
  blend?: boolean;
  className?: string;
  /** Override the built-in English text. */
  labels?: { salePrice?: string; regularPrice?: string; colours?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

/** A product tile for listings: photo, second photo on hover, colour swatches and sale pricing. */
export function ProductCard({
  href,
  title,
  subtitle,
  price,
  compareAtPrice,
  currency = "EUR",
  locale = "en",
  image,
  hoverImage,
  imageAlt,
  badge,
  swatches,
  blend = false,
  className,
  labels,
}: ProductCardProps) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const swatch = picked === null ? undefined : swatches?.[picked];
  const front = swatch?.image ?? image;
  const back = swatch ? swatch.hoverImage : hoverImage;
  const onSale = compareAtPrice !== undefined && compareAtPrice > price;
  const saving = onSale ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  const text = { salePrice: "Sale price", regularPrice: "Regular price", colours: "Colours", ...labels };
  const photo = cx("absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 motion-reduce:transition-none", blend && "mix-blend-multiply");

  return (
    <article className={cx("group flex flex-col gap-3 text-foreground", className)}>
      <a href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-muted">
        <img src={front} alt="" loading="lazy" className={cx(photo, back && "group-hover:opacity-0")} />
        {back && <img src={back} alt="" loading="lazy" className={cx(photo, "opacity-0 group-hover:opacity-100")} />}
        {(badge || onSale) && (
          <span className={cx("absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold", onSale ? "bg-destructive text-white" : "bg-background text-foreground")}>
            {onSale ? `−${saving}%` : badge}
          </span>
        )}
      </a>

      {swatches && swatches.length > 0 && (
        <div role="group" aria-label={text.colours} className="-my-1 -ml-1 flex flex-wrap">
          {swatches.map((item, i) => {
            const active = picked === i || (picked === null && i === 0);
            return (
              <button
                key={item.name}
                type="button"
                title={item.name}
                aria-label={item.name}
                aria-pressed={active}
                onClick={() => setPicked(i)}
                className="flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  style={{ backgroundColor: item.color }}
                  className={cx("h-5 w-5 rounded-full border border-black/10 ring-offset-2 ring-offset-background", active && "ring-2 ring-foreground")}
                />
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">
            <a href={href} className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <span className="sr-only">{imageAlt ? `${imageAlt}: ` : ""}</span>
              {title}
            </a>
          </h3>
          {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <p className="shrink-0 text-right text-sm font-medium">
          {onSale && <span className="sr-only">{text.salePrice} </span>}
          <span className={cx(onSale && "text-destructive")}>{formatMoney(price, currency, locale)}</span>
          {onSale && (
            <>
              <span className="sr-only"> {text.regularPrice} </span>
              <s className="ml-2 font-normal text-muted-foreground">{formatMoney(compareAtPrice, currency, locale)}</s>
            </>
          )}
        </p>
      </div>
    </article>
  );
}
