"use client";

import * as React from "react";

export interface FilterGroup {
  /** The key this group's choices are stored under in `value`, e.g. "colour". */
  key: string;
  label: string;
  /** `count` is how many products match, shown next to the option. */
  options: { value: string; label: string; count?: number }[];
}

export interface FilterBarProps {
  filters: FilterGroup[];
  /** Picked option values by group key, e.g. `{ colour: ["bottle-green"] }`. Groups with nothing picked are left out. */
  value?: Record<string, string[]>;
  defaultValue?: Record<string, string[]>;
  onValueChange?: (value: Record<string, string[]>) => void;
  /** Leave out to hide the sort menu. */
  sortOptions?: { value: string; label: string }[];
  sort?: string;
  /** Defaults to the first sort option. */
  defaultSort?: string;
  onSortChange?: (value: string) => void;
  /** How many products match. Announced to screen readers when it changes. */
  resultCount?: number;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    filters?: string;
    activeFilters?: string;
    /** Read after a group's name when it has choices: "2 selected". */
    selected?: (count: number) => string;
    removeFilter?: (label: string) => string;
    clearAll?: string;
    results?: (count: number) => string;
    sort?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Filter buttons that open checkbox lists, removable chips for what is picked, a result count and a sort menu. */
export function FilterBar({ filters, value, defaultValue, onValueChange, sortOptions, sort, defaultSort, onSortChange, resultCount, className, labels }: FilterBarProps) {
  const [internalValue, setInternalValue] = React.useState<Record<string, string[]>>(defaultValue ?? {});
  const [internalSort, setInternalSort] = React.useState(defaultSort ?? sortOptions?.[0]?.value ?? "");
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  /** On wide screens the panel hangs from its button's left edge, or from the right edge when that would leave the viewport. */
  const [alignEnd, setAlignEnd] = React.useState(false);
  const triggers = React.useRef(new Map<string, HTMLButtonElement>());
  const panelRef = React.useRef<HTMLDivElement>(null);
  const chipsRef = React.useRef<HTMLDivElement>(null);
  /** Index of the chip to focus once the removed one is gone. */
  const refocus = React.useRef<number | null>(null);
  /** Timer that gives focus back to a filter button after a press outside its panel. */
  const handBack = React.useRef(0);
  const sortId = React.useId();
  const selected = value ?? internalValue;
  const text = {
    filters: "Filters",
    activeFilters: "Active filters",
    selected: (count: number) => `${count} selected`,
    removeFilter: (label: string) => `Remove filter ${label}`,
    clearAll: "Clear all",
    results: (count: number) => `${count} ${count === 1 ? "product" : "products"}`,
    sort: "Sort by",
    ...labels,
  };
  const chips = filters.flatMap((group) =>
    group.options.filter((option) => selected[group.key]?.includes(option.value)).map((option) => ({ key: group.key, value: option.value, label: option.label })),
  );

  const commit = (next: Record<string, string[]>) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };
  const toggle = (key: string, option: string) => {
    const current = selected[key] ?? [];
    const picked = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    const next = { ...selected };
    if (picked.length > 0) next[key] = picked;
    else delete next[key];
    commit(next);
  };
  const close = (key: string) => {
    triggers.current.get(key)?.focus();
    setOpenKey(null);
  };

  React.useEffect(() => {
    if (!openKey) return;
    const trigger = triggers.current.get(openKey);
    // Opening a panel overrules a hand-back still waiting from the panel that just closed.
    window.clearTimeout(handBack.current);
    panelRef.current?.querySelector("input")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || panelRef.current?.contains(target) || trigger?.contains(target)) return;
      setOpenKey(null);
      // A press on another control moves focus there by itself. A press on empty space would drop it, so hand it back to the button.
      handBack.current = window.setTimeout(() => {
        if (document.activeElement === document.body) trigger?.focus();
      }, 0);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openKey]);

  // Removing a chip removes the focused button, so move focus to its neighbour, or back to the first filter when none are left.
  React.useEffect(() => {
    const index = refocus.current;
    refocus.current = null;
    // Only step in when focus really was dropped: the chip is gone and nothing else has taken focus.
    if (index === null || document.activeElement !== document.body) return;
    const buttons = Array.from(chipsRef.current?.querySelectorAll("button") ?? []);
    (buttons[Math.min(index, buttons.length - 1)] ?? triggers.current.get(filters[0]?.key ?? ""))?.focus();
  });

  return (
    <div className={cx("flex flex-col gap-3 text-foreground", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
        {/* On narrow screens the buttons scroll sideways and the open panel spans this wrapper, so it never leaves the viewport. */}
        <div className="relative min-w-0">
          <div role="group" aria-label={text.filters} className="-m-1 flex gap-2 overflow-x-auto p-1 sm:flex-wrap sm:overflow-visible">
            {filters.map((group) => {
              const open = openKey === group.key;
              const count = selected[group.key]?.length ?? 0;
              return (
                <div
                  key={group.key}
                  className="shrink-0 sm:relative"
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" || !open) return;
                    event.stopPropagation();
                    close(group.key);
                  }}
                  onBlur={(event) => {
                    if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpenKey(null);
                  }}
                >
                  <button
                    ref={(node) => {
                      if (node) triggers.current.set(group.key, node);
                      else triggers.current.delete(group.key);
                    }}
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    onClick={(event) => {
                      if (open) return close(group.key);
                      setAlignEnd(event.currentTarget.getBoundingClientRect().left + 272 > document.documentElement.clientWidth);
                      setOpenKey(group.key);
                    }}
                    className={cx(
                      "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground motion-reduce:transition-none",
                      open || count > 0 ? "border-foreground" : "border-border",
                      ring,
                    )}
                  >
                    {group.label}
                    {count > 0 && (
                      <>
                        <span aria-hidden="true" className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-xs tabular-nums text-primary-foreground">
                          {count}
                        </span>
                        <span className="sr-only">{text.selected(count)}</span>
                      </>
                    )}
                    <svg viewBox="0 0 16 16" aria-hidden="true" className={cx("h-4 w-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </button>
                  {open && (
                    <div
                      ref={panelRef}
                      role="dialog"
                      aria-label={group.label}
                      className={cx("absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border border-border bg-background p-2 shadow-lg sm:w-64", alignEnd ? "sm:left-auto" : "sm:right-auto")}
                    >
                      <ul className="max-h-72 overflow-y-auto">
                        {group.options.map((option) => (
                          <li key={option.value}>
                            <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground">
                              <input
                                type="checkbox"
                                checked={selected[group.key]?.includes(option.value) ?? false}
                                onChange={() => toggle(group.key, option.value)}
                                className={cx("h-4 w-4 shrink-0 rounded-sm accent-primary", ring)}
                              />
                              <span className="flex-1">{option.label}</span>
                              {option.count !== undefined && <span className="tabular-nums text-muted-foreground">{option.count}</span>}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-11 min-w-0 items-center justify-between gap-4 md:shrink-0 md:justify-end">
          {resultCount !== undefined && (
            <p aria-live="polite" className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {text.results(resultCount)}
            </p>
          )}
          {sortOptions && sortOptions.length > 0 && (
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <label htmlFor={sortId} className="whitespace-nowrap text-sm text-muted-foreground">
                {text.sort}
              </label>
              <select
                id={sortId}
                value={sort ?? internalSort}
                onChange={(event) => {
                  if (sort === undefined) setInternalSort(event.target.value);
                  onSortChange?.(event.target.value);
                }}
                className={cx("h-11 min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground", ring)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div ref={chipsRef} role="group" aria-label={text.activeFilters} className="flex flex-wrap items-center gap-2">
          {chips.map((chip, index) => (
            <button
              key={`${chip.key}:${chip.value}`}
              type="button"
              aria-label={text.removeFilter(chip.label)}
              onClick={() => {
                refocus.current = index;
                toggle(chip.key, chip.value);
              }}
              className={cx("inline-flex min-h-8 items-center gap-1.5 rounded-full bg-secondary pl-3 pr-2 text-sm text-secondary-foreground transition-colors hover:bg-secondary/80 motion-reduce:transition-none", ring)}
            >
              {chip.label}
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              refocus.current = 0;
              commit({});
            }}
            className={cx("min-h-8 rounded-sm px-2 text-sm underline underline-offset-4 hover:text-muted-foreground", ring)}
          >
            {text.clearAll}
          </button>
        </div>
      )}
    </div>
  );
}
