"use client";

import * as React from "react";

export interface ReviewsListItem {
  id: string;
  author: string;
  /** 1 to 5. */
  rating: number;
  /** ISO date, e.g. "2026-10-28". Used for sorting by newest. */
  date: string;
  title?: string;
  body: string;
  /** Shows a "Verified buyer" mark. Set it only when the review is tied to an order. */
  verified?: boolean;
  /** What the reviewer bought, e.g. "Bottle green / M". */
  variant?: string;
  /** How many people found the review helpful so far. */
  helpful?: number;
}

export type ReviewsListSort = "newest" | "highest" | "lowest";

export interface ReviewsListProps {
  reviews: ReviewsListItem[];
  /** The picked order. Pass it to control the sorting yourself, e.g. to sort on the server. */
  sort?: ReviewsListSort;
  /** Defaults to "newest". */
  defaultSort?: ReviewsListSort;
  onSortChange?: (sort: ReviewsListSort) => void;
  /** How many reviews show at first, and how many more each "Show more reviews" press adds. Defaults to 3. */
  pageSize?: number;
  /** Shows a "Helpful" button on each review. The visitor's vote is added to `helpful` straight away and taken back if this throws or rejects. One vote per review. */
  onHelpful?: (id: string) => void | Promise<void>;
  /** Locale for dates and numbers. Defaults to "en" so server and browser agree; pass the store's locale. */
  locale?: string;
  /** A heading over the list. Leave out when the list sits under a heading of its own. */
  title?: string;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    /** Spoken for a row of stars: "Rated 4 out of 5". */
    rating?: (rating: number) => string;
    /** "8 reviews". */
    count?: (count: number) => string;
    sort?: string;
    newest?: string;
    highest?: string;
    lowest?: string;
    verified?: string;
    /** Label before the variant: "Bought". */
    bought?: string;
    helpful?: string;
    /** Read after the helpful button's text so each button says which review it is for. */
    helpfulFor?: (author: string) => string;
    showMore?: string;
    /** Announced after "Show more reviews": "Showing 6 of 8 reviews". */
    showing?: (shown: number, total: number) => string;
    empty?: string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const formatDate = (iso: string, locale: string) => {
  const date = new Date(iso);
  // Dates are formatted in UTC so "2026-10-28" stays the 28th in every time zone.
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
};

const time = (iso: string) => {
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const STAR = "M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z";

/** Five stars, outlined when empty and filled from the left up to `value`. */
function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} className="relative block h-4 w-4 shrink-0">
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-full w-full text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
            <path d={STAR} />
          </svg>
          <span style={{ width: `${Math.min(Math.max(value - index, 0), 1) * 100}%` }} className="absolute inset-y-0 left-0 overflow-hidden">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 max-w-none text-foreground" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
              <path d={STAR} />
            </svg>
          </span>
        </span>
      ))}
    </span>
  );
}

/** Full product reviews with stars, verified-buyer marks and sorting, a few at a time with a "Show more reviews" button. */
export function ReviewsList({ reviews, sort, defaultSort = "newest", onSortChange, pageSize = 3, onHelpful, locale = "en", title, className, labels }: ReviewsListProps) {
  const [internalSort, setInternalSort] = React.useState<ReviewsListSort>(defaultSort);
  const [shown, setShown] = React.useState(pageSize);
  const [votes, setVotes] = React.useState<Record<string, boolean>>({});
  const [message, setMessage] = React.useState("");
  const listRef = React.useRef<HTMLOListElement>(null);
  /** The first review "Show more" revealed, which gets focus once it is on screen. */
  const focusIndex = React.useRef<number | null>(null);
  const sortId = React.useId();
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const text = {
    rating: (rating: number) => `Rated ${number(rating)} out of 5`,
    count: (count: number) => `${number(count)} ${count === 1 ? "review" : "reviews"}`,
    sort: "Sort by",
    newest: "Newest",
    highest: "Highest rated",
    lowest: "Lowest rated",
    verified: "Verified buyer",
    bought: "Bought",
    helpful: "Helpful",
    helpfulFor: (author: string) => `review by ${author}`,
    showMore: "Show more reviews",
    showing: (count: number, total: number) => `Showing ${number(count)} of ${number(total)} reviews`,
    empty: "No reviews yet.",
    ...labels,
  };
  const order = sort ?? internalSort;

  const sorted = React.useMemo(() => {
    const list = [...reviews];
    const newest = (a: ReviewsListItem, b: ReviewsListItem) => time(b.date) - time(a.date);
    if (order === "highest") list.sort((a, b) => b.rating - a.rating || newest(a, b));
    else if (order === "lowest") list.sort((a, b) => a.rating - b.rating || newest(a, b));
    else list.sort(newest);
    return list;
  }, [reviews, order]);
  const visible = sorted.slice(0, shown);

  React.useEffect(() => {
    if (focusIndex.current === null) return;
    listRef.current?.querySelectorAll<HTMLElement>("article")[focusIndex.current]?.focus();
    focusIndex.current = null;
  }, [shown]);

  const showMore = () => {
    const next = Math.min(shown + pageSize, sorted.length);
    focusIndex.current = shown;
    setShown(next);
    setMessage(text.showing(next, sorted.length));
  };

  const vote = async (id: string) => {
    if (!onHelpful || votes[id]) return;
    setVotes((current) => ({ ...current, [id]: true }));
    try {
      await onHelpful(id);
    } catch {
      setVotes((current) => ({ ...current, [id]: false }));
    }
  };

  return (
    <section aria-labelledby={title ? `${sortId}-title` : undefined} className={cx("text-foreground", className)}>
      {title && (
        <h2 id={`${sortId}-title`} className="mb-4 text-xl font-semibold">
          {title}
        </h2>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm text-muted-foreground">{text.count(reviews.length)}</p>
        {reviews.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor={sortId} className="whitespace-nowrap text-sm text-muted-foreground">
              {text.sort}
            </label>
            <select
              id={sortId}
              value={order}
              onChange={(event) => {
                const next = event.target.value as ReviewsListSort;
                if (sort === undefined) setInternalSort(next);
                onSortChange?.(next);
              }}
              className={cx("h-11 min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground", ring)}
            >
              <option value="newest">{text.newest}</option>
              <option value="highest">{text.highest}</option>
              <option value="lowest">{text.lowest}</option>
            </select>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        <ol ref={listRef} className="divide-y divide-border">
          {visible.map((review) => {
            const voted = votes[review.id] === true;
            const helpfulCount = (review.helpful ?? 0) + (voted ? 1 : 0);
            return (
              <li key={review.id}>
                <article tabIndex={-1} aria-labelledby={`${sortId}-${review.id}`} className="grid gap-3 rounded-sm py-6 outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[12rem_1fr] md:gap-8">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm md:flex-col md:items-start">
                    <p id={`${sortId}-${review.id}`} className="font-medium">
                      {review.author}
                    </p>
                    {review.verified && (
                      <p className="inline-flex items-center gap-1 text-emerald-700">
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="8" cy="8" r="6.25" />
                          <path d="m5.5 8.25 1.75 1.75L10.75 6.5" />
                        </svg>
                        {text.verified}
                      </p>
                    )}
                    <time dateTime={review.date} className="text-muted-foreground">
                      {formatDate(review.date, locale)}
                    </time>
                  </div>

                  <div className="min-w-0">
                    <Stars value={review.rating} label={text.rating(review.rating)} />
                    {review.title && <h3 className="mt-3 text-base font-medium">{review.title}</h3>}
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{review.body}</p>
                    {review.variant && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {text.bought}: {review.variant}
                      </p>
                    )}
                    {onHelpful && (
                      <button
                        type="button"
                        aria-pressed={voted}
                        onClick={() => vote(review.id)}
                        className={cx(
                          "-ml-2 mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors duration-150 motion-reduce:transition-none",
                          voted ? "font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          ring,
                        )}
                      >
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0" fill={voted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
                          <path d="M5 7.25 7.5 2c1.1 0 1.75.8 1.5 1.9L8.6 6h3.9a1.5 1.5 0 0 1 1.47 1.8l-.9 4.5A1.5 1.5 0 0 1 11.6 13.5H5zM2 7.25h3v6.25H2z" />
                        </svg>
                        {text.helpful} <span className="tabular-nums">({number(helpfulCount)})</span>
                        <span className="sr-only">, {text.helpfulFor(review.author)}</span>
                      </button>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {shown < sorted.length && (
        <div className="border-t border-border pt-6">
          <button
            type="button"
            onClick={showMore}
            className={cx("inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-medium hover:bg-accent hover:text-accent-foreground sm:w-auto", ring)}
          >
            {text.showMore}
          </button>
        </div>
      )}
      <p role="status" className="sr-only">
        {message}
      </p>
    </section>
  );
}
