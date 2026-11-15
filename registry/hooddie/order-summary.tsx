import * as React from "react";

export interface OrderSummaryItem {
  id: string;
  title: string;
  /** What was picked, e.g. "Bottle green / M". */
  variant?: string;
  quantity: number;
  /** Price of one, in major units: 59 means €59.00. The line shows price × quantity. */
  price: number;
  image?: string;
}

export interface OrderSummaryProps {
  /** Line items shown above the totals. Leave out for totals only. */
  items?: OrderSummaryItem[];
  subtotal: number;
  /** A discount, shown as a negative amount. `label` is the code or its name, e.g. "WELCOME10". */
  discount?: { label: string; amount: number };
  /** `null` shows "Calculated at checkout", `0` shows "Free". Leave out to hide the row. */
  shipping?: number | null;
  /** Tax. With `included`, it becomes a note under the total ("Includes €25.35 VAT") instead of a row. */
  tax?: { label: string; amount: number; included?: boolean };
  total: number;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for prices and dates. Defaults to "en" so the server and the browser agree; pass your store's locale. */
  locale?: string;
  /** Heading of the card. Defaults to "Order summary". */
  title?: string;
  /** Rendered under the total, e.g. a checkout button. */
  children?: React.ReactNode;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    subtotal?: string;
    discount?: string;
    shipping?: string;
    shippingFree?: string;
    shippingPending?: string;
    total?: string;
    quantity?: string;
    includesTax?: (amount: string, label: string) => string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale?: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

/** Line items, discount, shipping, tax and total for the bag or checkout page. */
export function OrderSummary({
  items,
  subtotal,
  discount,
  shipping,
  tax,
  total,
  currency = "EUR",
  locale = "en",
  title = "Order summary",
  children,
  className,
  labels,
}: OrderSummaryProps) {
  const text = {
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    shippingFree: "Free",
    shippingPending: "Calculated at checkout",
    total: "Total",
    quantity: "Quantity",
    includesTax: (amount: string, label: string) => `Includes ${amount} ${label}`,
    ...labels,
  };
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const row = "flex items-baseline justify-between gap-4";
  const amount = "shrink-0 text-right tabular-nums";

  return (
    <section className={cx("rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6", className)}>
      <h2 className="text-lg font-semibold">{title}</h2>

      {items && items.length > 0 && (
        <ul className="mt-5 flex flex-col gap-4 border-b border-border pb-5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4">
              {item.image && (
                <span className="relative shrink-0">
                  <img src={item.image} alt="" loading="lazy" className="h-14 w-14 rounded-md bg-muted object-cover object-top" />
                  <span aria-hidden="true" className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-foreground px-1 text-xs font-medium tabular-nums text-background">
                    {item.quantity}
                  </span>
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.variant && <p className="truncate text-sm text-muted-foreground">{item.variant}</p>}
                {/* With a photo the quantity sits in the badge, so this line is for screen readers only. */}
                <p className={cx("text-sm text-muted-foreground", item.image && "sr-only")}>
                  {text.quantity} {item.quantity}
                </p>
              </div>
              <p className={cx("text-sm font-medium", amount)}>{money(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-5 flex flex-col gap-3 text-sm">
        <div className={row}>
          <dt>{text.subtotal}</dt>
          <dd className={amount}>{money(subtotal)}</dd>
        </div>
        {discount && (
          <div className={row}>
            <dt className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              {text.discount}
              <span className="rounded border border-border px-1.5 py-0.5 text-xs font-medium">{discount.label}</span>
            </dt>
            <dd className={cx(amount, "text-emerald-700 dark:text-emerald-400")}>−{money(Math.abs(discount.amount))}</dd>
          </div>
        )}
        {shipping !== undefined && (
          <div className={row}>
            <dt>{text.shipping}</dt>
            <dd className={cx(amount, shipping === null && "text-muted-foreground")}>
              {shipping === null ? text.shippingPending : shipping === 0 ? text.shippingFree : money(shipping)}
            </dd>
          </div>
        )}
        {tax && !tax.included && (
          <div className={row}>
            <dt>{tax.label}</dt>
            <dd className={amount}>{money(tax.amount)}</dd>
          </div>
        )}
        <div className={cx(row, "border-t border-border pt-4 text-lg font-semibold")}>
          <dt>{text.total}</dt>
          <dd className={amount}>{money(total)}</dd>
        </div>
      </dl>
      {tax?.included && <p className="mt-1 text-right text-sm text-muted-foreground">{text.includesTax(money(tax.amount), tax.label)}</p>}

      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}
