import * as React from "react";

export type StockStatus = "in-stock" | "low" | "out" | "preorder";

export interface StockIndicatorProps {
  /** The stock state. Leave out to work it out from `quantity` and `lowAt`. */
  status?: StockStatus;
  /** Units left. 0 or less is sold out, `lowAt` or less is low, more is in stock. Also shown in the low text. */
  quantity?: number;
  /** At or below this many units the indicator says "Only n left". Defaults to 5. */
  lowAt?: number;
  /** Text after the status, e.g. "Ships tomorrow" or "Ships from 4 December". */
  shipBy?: string;
  className?: string;
  /** Override the built-in English text. `low` gets the quantity when one is known. */
  labels?: { inStock?: string; low?: (quantity?: number) => string; out?: string; preorder?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const tone: Record<StockStatus, string> = {
  "in-stock": "text-emerald-700 dark:text-emerald-400",
  low: "text-amber-700 dark:text-amber-400",
  out: "text-destructive",
  preorder: "text-muted-foreground",
};

/** Works out the stock state from a quantity. Exported so a variant picker can use the same rule. */
export function stockStatus(quantity: number | undefined, lowAt = 5): StockStatus {
  if (quantity === undefined) return "in-stock";
  if (quantity <= 0) return "out";
  return quantity <= lowAt ? "low" : "in-stock";
}

/** In stock, only a few left, sold out or preorder: a coloured dot with the state in words, and an optional shipping line. */
export function StockIndicator({ status, quantity, lowAt = 5, shipBy, className, labels }: StockIndicatorProps) {
  const state = status ?? stockStatus(quantity, lowAt);
  const text = {
    inStock: "In stock",
    low: (left?: number) => (left !== undefined && left > 0 ? `Only ${left} left` : "Low stock"),
    out: "Sold out",
    preorder: "Preorder",
    ...labels,
  };
  const words = state === "in-stock" ? text.inStock : state === "low" ? text.low(quantity) : state === "out" ? text.out : text.preorder;

  return (
    <p className={cx("flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm", className)}>
      <span className={cx("inline-flex items-center gap-2 font-medium", tone[state])}>
        <span aria-hidden="true" className={cx("h-2 w-2 shrink-0 rounded-full", state === "preorder" ? "border-2 border-current" : "bg-current")} />
        {words}
      </span>
      {shipBy && (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="sr-only">, </span>
          <span className="text-muted-foreground">{shipBy}</span>
        </>
      )}
    </p>
  );
}
