"use client";

import * as React from "react";

export interface VariantPickerColour {
  /** Colour name. It is the value, the text after "Colour:" and what screen readers hear. */
  name: string;
  /** Any CSS colour, e.g. "#1F4D3A". */
  color: string;
}

export interface VariantPickerSize {
  value: string;
  /** False crosses the size out. It can't be picked, but it is still announced as sold out. Defaults to true. */
  available?: boolean;
}

export interface VariantPickerProps {
  /** Colour swatches. Leave out to show sizes only. */
  colours?: VariantPickerColour[];
  /** The picked colour's name. Pass it to control the colour yourself. */
  colour?: string;
  defaultColour?: string;
  onColourChange?: (name: string) => void;
  /** Size buttons. Leave out to show colours only. */
  sizes?: VariantPickerSize[];
  /** The picked size. Pass it to control the size yourself. */
  size?: string;
  defaultSize?: string;
  onSizeChange?: (value: string) => void;
  /** Shows a "Size guide" button on the size row and runs this when it is pressed. */
  onSizeGuideClick?: () => void;
  className?: string;
  /** Override the built-in English text. */
  labels?: { colour?: string; size?: string; sizeGuide?: string; soldOut?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

/** Colour swatches and size buttons for a product page. Sold-out sizes are crossed out and still read to screen readers. */
export function VariantPicker({
  colours,
  colour,
  defaultColour,
  onColourChange,
  sizes,
  size,
  defaultSize,
  onSizeChange,
  onSizeGuideClick,
  className,
  labels,
}: VariantPickerProps) {
  const [colourState, setColourState] = React.useState(defaultColour);
  const [sizeState, setSizeState] = React.useState(defaultSize);
  const pickedColour = colour ?? colourState;
  const pickedSize = size ?? sizeState;
  const text = { colour: "Colour", size: "Size", sizeGuide: "Size guide", soldOut: "sold out", ...labels };

  const pickColour = (name: string) => {
    if (name === pickedColour) return;
    if (colour === undefined) setColourState(name);
    onColourChange?.(name);
  };
  const pickSize = (value: string) => {
    if (value === pickedSize) return;
    if (size === undefined) setSizeState(value);
    onSizeChange?.(value);
  };

  // One option per group is in the tab order: the picked one, or else the first that can be picked.
  const colourStop = colours?.some((item) => item.name === pickedColour) ? pickedColour : colours?.[0]?.name;
  const sizeStop = sizes?.some((item) => item.value === pickedSize) ? pickedSize : (sizes?.find((item) => item.available !== false) ?? sizes?.[0])?.value;

  return (
    <div className={cx("flex flex-col gap-6 text-foreground", className)}>
      {colours && colours.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {text.colour}
            {pickedColour && <span className="font-normal text-muted-foreground">: {pickedColour}</span>}
          </p>
          <div role="radiogroup" aria-label={text.colour} onKeyDown={onArrowKey} className="-m-1.5 flex flex-wrap">
            {colours.map((item) => {
              const checked = item.name === pickedColour;
              return (
                <button
                  key={item.name}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={item.name}
                  title={item.name}
                  tabIndex={item.name === colourStop ? 0 : -1}
                  onClick={() => pickColour(item.name)}
                  className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">
              {text.size}
              {pickedSize && <span className="font-normal text-muted-foreground">: {pickedSize}</span>}
            </p>
            {onSizeGuideClick && (
              <button type="button" onClick={onSizeGuideClick} className={cx("-my-1.5 h-8 rounded-sm text-sm underline underline-offset-4 hover:no-underline", focusRing)}>
                {text.sizeGuide}
              </button>
            )}
          </div>
          <div role="radiogroup" aria-label={text.size} onKeyDown={onArrowKey} className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2">
            {sizes.map((item) => {
              const checked = item.value === pickedSize;
              const soldOut = item.available === false;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-disabled={soldOut || undefined}
                  aria-label={soldOut ? `${item.value}, ${text.soldOut}` : undefined}
                  tabIndex={item.value === sizeStop ? 0 : -1}
                  onClick={() => {
                    if (!soldOut) pickSize(item.value);
                  }}
                  className={cx(
                    "relative flex h-11 items-center justify-center overflow-hidden rounded-md border px-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
                    focusRing,
                    checked ? "border-primary bg-primary text-primary-foreground" : soldOut ? "cursor-not-allowed border-border text-muted-foreground" : "border-border hover:border-foreground",
                  )}
                >
                  {item.value}
                  {soldOut && (
                    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                      <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
