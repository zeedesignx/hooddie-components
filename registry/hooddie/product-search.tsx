"use client";

import * as React from "react";

export interface ProductSearchItem {
  id: string;
  title: string;
  /** The product page. Each result is a real link, so it can be opened in a new tab. */
  href: string;
  /** Price in major units: 59 means €59.00. */
  price: number;
  /** The earlier price. When it is higher than `price`, the result shows a sale. */
  compareAtPrice?: number;
  /** A small photo shown beside the result. */
  image?: string;
  /** A second line, e.g. the colour. Local search matches it too. */
  subtitle?: string;
}

export interface ProductSearchProps {
  /** Products to search on the page. Every word typed has to appear in the title or subtitle. Leave out when you pass `results`. */
  products?: ProductSearchItem[];
  /** Results from your own search, shown as they are. Pass this with `query` and `onQueryChange` to search on the server. */
  results?: ProductSearchItem[];
  /** How many products match in all, when `results` holds only the first few. */
  resultCount?: number;
  /** Shows "Searching…" while your results are on their way. */
  loading?: boolean;
  /** The text in the box. */
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Whether the result list is showing. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called when the visitor asks for every result: Enter with no result picked, or the "See all results" row. Leave out (and leave out `action`) to hide that row. */
  onSubmit?: (query: string) => void;
  /** The search page URL, e.g. "/search". The box then submits there as a normal form (`?q=…`), so search works before JavaScript loads. */
  action?: string;
  /** The query parameter name. Defaults to "q". */
  name?: string;
  /** Called when a result is picked by click or Enter, before the browser follows its link. Call `event.preventDefault()` to route it yourself. */
  onSelect?: (item: ProductSearchItem, event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Most results in the list. Defaults to 6. */
  maxResults?: number;
  /** Characters needed before results show. Defaults to 1. */
  minQueryLength?: number;
  /** ISO currency code. Defaults to "EUR". */
  currency?: string;
  /** Locale for the prices. Defaults to "en" so server and browser agree; pass the store's locale. */
  locale?: string;
  /** Blend the thumbnails into the grey background. Use for packshots on white. */
  blend?: boolean;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    search?: string;
    placeholder?: string;
    clear?: string;
    results?: string;
    /** Shown over the list and announced to screen readers. */
    count?: (count: number) => string;
    seeAll?: (count: number, query: string) => string;
    searching?: string;
    noResults?: (query: string) => string;
    noResultsHint?: string;
    salePrice?: string;
    regularPrice?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatMoney = (amount: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);

/** Lower case without accents, keeping a map back to the original positions so matches can be highlighted. */
function fold(value: string) {
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const folded = value[i].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    for (let j = 0; j < folded.length; j++) {
      text += folded[j];
      map.push(i);
    }
  }
  map.push(value.length);
  return { text, map };
}

const termsOf = (query: string) => fold(query.trim()).text.split(/\s+/).filter(Boolean);

/** Scores a product for the typed words: higher is better, -1 when a word is missing. */
function score(item: ProductSearchItem, terms: string[]) {
  const title = fold(item.title).text;
  const all = `${title} ${fold(item.subtitle ?? "").text}`;
  let total = 0;
  for (const term of terms) {
    const at = all.indexOf(term);
    if (at === -1) return -1;
    if (title.startsWith(term)) total += 4;
    else if (new RegExp(`(^|\\W)${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(title)) total += 3;
    else if (at < title.length) total += 2;
    else total += 1;
  }
  return total;
}

/** The text with every typed word in bold. */
function Highlight({ value, terms }: { value: string; terms: string[] }) {
  if (terms.length === 0) return <>{value}</>;
  const { text, map } = fold(value);
  const marked = new Array<boolean>(value.length).fill(false);
  for (const term of terms) {
    let from = text.indexOf(term);
    while (from !== -1) {
      for (let i = map[from]; i < map[from + term.length]; i++) marked[i] = true;
      from = text.indexOf(term, from + term.length);
    }
  }
  const pieces: React.ReactNode[] = [];
  let start = 0;
  for (let i = 1; i <= value.length; i++) {
    if (i === value.length || marked[i] !== marked[start]) {
      const piece = value.slice(start, i);
      pieces.push(
        marked[start] ? (
          <mark key={start} className="bg-transparent font-semibold text-inherit">
            {piece}
          </mark>
        ) : (
          piece
        ),
      );
      start = i;
    }
  }
  return <>{pieces}</>;
}

/** A product search box with suggestions as you type: thumbnails, prices, the matched words in bold, full keyboard support and a no-results state. */
export function ProductSearch({
  products,
  results,
  resultCount,
  loading = false,
  query,
  defaultQuery = "",
  onQueryChange,
  open,
  defaultOpen = false,
  onOpenChange,
  onSubmit,
  action,
  name = "q",
  onSelect,
  maxResults = 6,
  minQueryLength = 1,
  currency = "EUR",
  locale = "en",
  blend = false,
  className,
  labels,
}: ProductSearchProps) {
  const [internalQuery, setInternalQuery] = React.useState(defaultQuery);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [active, setActive] = React.useState(-1);
  const [announcement, setAnnouncement] = React.useState("");
  const rootRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  const text = {
    search: "Search products",
    placeholder: "Search products",
    clear: "Clear search",
    results: "Suggested products",
    count: (count: number) => `${count} ${count === 1 ? "product" : "products"}`,
    seeAll: (count: number, q: string) => (count === 1 ? `See the result for “${q}”` : `See all ${count} results for “${q}”`),
    searching: "Searching…",
    noResults: (q: string) => `No products match “${q}”`,
    noResultsHint: "Check the spelling, or try a broader word such as “hoodie”.",
    salePrice: "Sale price",
    regularPrice: "Regular price",
    ...labels,
  };

  const value = query ?? internalQuery;
  const trimmed = value.trim();
  const isOpen = (open ?? internalOpen) && trimmed.length >= minQueryLength;
  const terms = React.useMemo(() => termsOf(trimmed), [trimmed]);

  const matches = React.useMemo(() => {
    if (results) return results;
    if (!products || terms.length === 0) return [];
    return products
      .map((item, index) => ({ item, index, score: score(item, terms) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.item);
  }, [products, results, terms]);
  const shownResults = matches.slice(0, maxResults);
  const total = resultCount ?? matches.length;
  const canSeeAll = Boolean(onSubmit || action) && !loading && total > 0;
  /** Every row the arrow keys move through: the results, then "See all". */
  // While loading the results aren't rendered, so there are no rows to arrow through and Enter submits.
  const rowCount = loading ? 0 : shownResults.length + (canSeeAll ? 1 : 0);
  const optionId = (index: number) => `${id}-option-${index}`;
  const listId = `${id}-list`;

  const setQuery = (next: string) => {
    if (query === undefined) setInternalQuery(next);
    onQueryChange?.(next);
    setActive(-1);
  };
  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) setActive(-1);
  };

  // Tell screen readers how many products match, once typing pauses.
  React.useEffect(() => {
    if (!isOpen) {
      setAnnouncement("");
      return;
    }
    const timer = window.setTimeout(() => {
      setAnnouncement(loading ? text.searching : total > 0 ? text.count(total) : text.noResults(trimmed));
    }, 500);
    return () => window.clearTimeout(timer);
    // The labels are read fresh each time the numbers change; listing them would restart the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loading, total, trimmed]);

  // Results change under the highlight when a search starts or ends, so start again from the box.
  React.useEffect(() => setActive(-1), [loading]);

  // Keep the highlighted row in view while arrowing through a long list.
  React.useEffect(() => {
    if (active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // A press anywhere outside the box closes the list, also when the list was open without focus.
  React.useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const submitAll = () => {
    setOpen(false);
    if (onSubmit) onSubmit(trimmed);
    else rootRef.current?.submit();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!isOpen) {
          if (trimmed.length >= minQueryLength) setOpen(true);
          return;
        }
        if (rowCount === 0) return;
        const down = event.key === "ArrowDown";
        setActive((current) => (down ? (current + 1) % rowCount : current <= 0 ? rowCount - 1 : current - 1));
        return;
      }
      case "Enter": {
        if (!isOpen || active < 0 || active >= rowCount) return; // Lets the form submit.
        event.preventDefault();
        if (active < shownResults.length) document.getElementById(optionId(active))?.click();
        else submitAll();
        return;
      }
      case "Escape": {
        // First Escape closes the list, the second clears the box.
        // Stop here so a surrounding dialog doesn't close on the same key.
        if (isOpen) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        } else if (value) {
          event.preventDefault();
          event.stopPropagation();
          setQuery("");
        }
        return;
      }
    }
  };

  return (
    <form
      ref={rootRef}
      role="search"
      action={action}
      onSubmit={(event) => {
        // Without a search page to go to, Enter only works on a highlighted result.
        if (!trimmed || (!onSubmit && !action)) {
          event.preventDefault();
          return;
        }
        setOpen(false);
        if (onSubmit) {
          event.preventDefault();
          onSubmit(trimmed);
        }
      }}
      onBlur={(event) => {
        if (isOpen && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      className={cx("relative w-full text-foreground", className)}
    >
      <label htmlFor={`${id}-input`} className="sr-only">
        {text.search}
      </label>
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
        <input
          ref={inputRef}
          id={`${id}-input`}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && active >= 0 && active < rowCount ? optionId(active) : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="search"
          enterKeyHint="search"
          placeholder={text.placeholder}
          value={value}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-md border border-border bg-background pl-11 pr-12 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        {value && (
          <button
            type="button"
            aria-label={text.clear}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      <div
        hidden={!isOpen}
        // Presses inside the list must not take focus from the box, or it would close before the click lands.
        onMouseDown={(event) => event.preventDefault()}
        className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
      >
        {loading ? (
          <p className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 animate-spin motion-reduce:animate-none">
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
            {text.searching}
          </p>
        ) : total === 0 ? (
          <div className="px-4 py-5">
            <p className="text-sm font-medium">{text.noResults(trimmed)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text.noResultsHint}</p>
          </div>
        ) : (
          <p aria-hidden="true" className="border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {text.count(total)}
          </p>
        )}
        <ul id={listId} role="listbox" aria-label={text.results} className={cx("max-h-96 overflow-y-auto overscroll-contain p-1.5", rowCount === 0 && "hidden")}>
          {!loading &&
            shownResults.map((item, index) => {
              const onSale = item.compareAtPrice !== undefined && item.compareAtPrice > item.price;
              return (
                <li key={item.id} role="presentation">
                  <a
                    id={optionId(index)}
                    role="option"
                    aria-selected={active === index}
                    href={item.href}
                    tabIndex={-1}
                    onMouseMove={() => active !== index && setActive(index)}
                    onClick={(event) => {
                      onSelect?.(item, event);
                      setOpen(false);
                    }}
                    className={cx("flex items-center gap-3 rounded-md p-2 text-sm", active === index && "bg-accent text-accent-foreground")}
                  >
                    {item.image ? (
                      <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded bg-muted">
                        <img src={item.image} alt="" loading="lazy" className={cx("absolute inset-0 h-full w-full object-cover object-top", blend && "mix-blend-multiply dark:mix-blend-normal")} />
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        <Highlight value={item.title} terms={terms} />
                      </span>
                      {item.subtitle && (
                        <span className={cx("block truncate", active === index ? "text-accent-foreground" : "text-muted-foreground")}>
                          <Highlight value={item.subtitle} terms={terms} />
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right font-medium">
                      {onSale && <span className="sr-only">{text.salePrice} </span>}
                      <span className={cx(onSale && "text-destructive")}>{formatMoney(item.price, currency, locale)}</span>
                      {onSale && (
                        <>
                          <span className="sr-only"> {text.regularPrice} </span>
                          <s className="block text-xs font-normal text-muted-foreground">{formatMoney(item.compareAtPrice!, currency, locale)}</s>
                        </>
                      )}
                    </span>
                  </a>
                </li>
              );
            })}
          {canSeeAll && (
            <li
              id={optionId(shownResults.length)}
              role="option"
              aria-selected={active === shownResults.length}
              onMouseMove={() => active !== shownResults.length && setActive(shownResults.length)}
              onClick={submitAll}
              className={cx(
                "mt-1 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-sm font-medium",
                active === shownResults.length && "bg-accent text-accent-foreground",
              )}
            >
              <span className="truncate">{text.seeAll(total, trimmed)}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </li>
          )}
        </ul>
      </div>

      <p id={`${id}-status`} role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </form>
  );
}
