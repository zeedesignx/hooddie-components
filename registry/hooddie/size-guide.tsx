"use client";

import * as React from "react";

export type SizeGuideUnit = "cm" | "in";

export interface SizeGuideColumn {
  /** The key to read from each row, e.g. "chest". */
  key: string;
  /** The column heading, e.g. "Chest". */
  label: string;
}

/** One size. Numbers are centimetres and are converted for inches. Strings are shown as they are. */
export type SizeGuideRow = { size: string } & Record<string, number | string>;

export interface SizeGuideProps {
  /** The measurement columns, after the size column. */
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
  /** The unit on show. Pass it to control the unit yourself. */
  unit?: SizeGuideUnit;
  /** The unit shown first when `unit` is not passed. Defaults to "cm". */
  defaultUnit?: SizeGuideUnit;
  onUnitChange?: (unit: SizeGuideUnit) => void;
  /** A size to mark as the visitor's, e.g. "M". */
  highlight?: string;
  /** What the table measures. Shown under the table and used as its name. Defaults to "Measurements". */
  caption?: string;
  className?: string;
  /** Override the built-in English text. `cm` and `in` are the button text, `centimetres` and `inches` the full words. */
  labels?: { size?: string; units?: string; cm?: string; in?: string; centimetres?: string; inches?: string; yourSize?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/** A measurement table that switches between centimetres and inches and marks one size as the visitor's. */
export function SizeGuide({ columns, rows, unit, defaultUnit = "cm", onUnitChange, highlight, caption = "Measurements", className, labels }: SizeGuideProps) {
  const [internal, setInternal] = React.useState<SizeGuideUnit>(defaultUnit);
  const current = unit ?? internal;
  const text = { size: "Size", units: "Units", cm: "cm", in: "in", centimetres: "centimetres", inches: "inches", yourSize: "Your size", ...labels };
  const unitName = (option: SizeGuideUnit) => (option === "cm" ? text.centimetres : text.inches);

  const pick = (next: SizeGuideUnit) => {
    if (next === current) return;
    if (unit === undefined) setInternal(next);
    onUnitChange?.(next);
  };

  // Fixed decimals, not the visitor's locale, so the server and the browser render the same text.
  const show = (value: number | string | undefined) => {
    if (typeof value !== "number") return value ?? "–";
    return current === "cm" ? String(value) : (value / 2.54).toFixed(1);
  };

  return (
    <div className={cx("flex flex-col gap-3 text-foreground", className)}>
      <div role="group" aria-label={text.units} className="flex gap-1 self-end rounded-md border border-border p-1">
        {(["cm", "in"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={current === option}
            onClick={() => pick(option)}
            className={cx(
              "h-8 w-12 rounded text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              current === option ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {text[option]}
            <span className="sr-only"> ({unitName(option)})</span>
          </button>
        ))}
      </div>

      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <table className="w-full border-collapse text-left text-sm">
          <caption className="caption-bottom border-t border-border px-4 py-3 text-left text-muted-foreground">
            {caption} ({unitName(current)})
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="px-4 py-3 font-medium">
                {text.size}
              </th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 text-right font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const marked = row.size === highlight;
              return (
                <tr key={row.size} aria-current={marked ? "true" : undefined} className={cx("border-b border-border last:border-b-0", marked && "bg-muted")}>
                  <th scope="row" className="whitespace-nowrap px-4 py-3 font-medium">
                    {row.size}
                    {marked && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{text.yourSize}</span>}
                  </th>
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {show(row[column.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
