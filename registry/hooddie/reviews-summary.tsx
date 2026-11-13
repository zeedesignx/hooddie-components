export interface Review {
  author: string;
  /** 1 to 5. */
  rating: number;
  /** ISO date, e.g. "2026-10-28". */
  date?: string;
  title?: string;
  body: string;
}

export interface ReviewsSummaryProps {
  /** Average rating from 0 to 5. Shown with one decimal. */
  average: number;
  /** How many reviews gave each star count, e.g. `{ 5: 86, 4: 31, 3: 9, 2: 3, 1: 2 }`. */
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  /** A few reviews to list under the summary. */
  reviews?: Review[];
  /** Locale for prices and dates. Defaults to "en" so the server and the browser agree; pass your store's locale. */
  locale?: string;
  /** Heading. Defaults to "Customer reviews". */
  title?: string;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    /** Spoken for a row of stars: "4.5 out of 5 stars". */
    rating?: (rating: string) => string;
    /** "Based on 131 reviews". */
    basedOn?: (count: number) => string;
    /** Row label: "5 stars". */
    stars?: (stars: number) => string;
    /** Read after the row label: "86 reviews". */
    reviewCount?: (count: number) => string;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const formatDate = (iso: string, locale?: string) => {
  const date = new Date(iso);
  // Dates are formatted in UTC so "2026-10-28" stays the 28th in every time zone.
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
};

const STAR = "M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z";

/** Five stars, outlined when empty and filled from the left up to `value`, so 4.5 shows half of the last one. */
function Stars({ value, label, size, className }: { value: number; label: string; size: string; className?: string }) {
  return (
    <span role="img" aria-label={label} className={cx("flex gap-0.5", className)}>
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} className={cx("relative block shrink-0", size)}>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-full w-full text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
            <path d={STAR} />
          </svg>
          <span style={{ width: `${Math.min(Math.max(value - index, 0), 1) * 100}%` }} className="absolute inset-y-0 left-0 overflow-hidden">
            <svg viewBox="0 0 20 20" aria-hidden="true" className={cx("max-w-none text-foreground", size)} fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
              <path d={STAR} />
            </svg>
          </span>
        </span>
      ))}
    </span>
  );
}

/** Average rating, a bar for each star count, and a short list of reviews. */
export function ReviewsSummary({ average, counts, reviews, locale = "en", title = "Customer reviews", className, labels }: ReviewsSummaryProps) {
  const number = (value: number, digits = 0) => new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 1) }).format(value);
  const text = {
    rating: (rating: string) => `${rating} out of 5 stars`,
    basedOn: (count: number) => `Based on ${number(count)} ${count === 1 ? "review" : "reviews"}`,
    stars: (stars: number) => `${stars} ${stars === 1 ? "star" : "stars"}`,
    reviewCount: (count: number) => `${number(count)} ${count === 1 ? "review" : "reviews"}`,
    ...labels,
  };
  const rows = ([5, 4, 3, 2, 1] as const).map((stars) => ({ stars, count: counts[stars] }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className={cx("text-foreground", className)}>
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-12">
        <div>
          {/* The star row below says the same number to screen readers. */}
          <p aria-hidden="true" className="text-5xl font-semibold leading-none tabular-nums">
            {number(average, 1)}
          </p>
          <Stars value={average} label={text.rating(number(average, 1))} size="h-5 w-5" className="mt-3" />
          <p className="mt-2 text-sm text-muted-foreground">{text.basedOn(total)}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.stars} className="grid grid-cols-[4rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="sr-only">
                {text.stars(row.stars)}: {text.reviewCount(row.count)}
              </span>
              <span aria-hidden="true" className="whitespace-nowrap">
                {text.stars(row.stars)}
              </span>
              <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
                <span style={{ width: `${total > 0 ? (row.count / total) * 100 : 0}%` }} className="block h-full rounded-full bg-foreground" />
              </span>
              <span aria-hidden="true" className="text-right tabular-nums text-muted-foreground">
                {number(row.count)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {reviews && reviews.length > 0 && (
        <div className="mt-8 divide-y divide-border border-t border-border">
          {reviews.map((review, index) => (
            <article key={`${review.author}-${index}`} className="py-6">
              <Stars value={review.rating} label={text.rating(number(review.rating))} size="h-4 w-4" />
              {review.title && <h3 className="mt-3 text-base font-medium">{review.title}</h3>}
              <p className="mt-2 text-sm leading-relaxed">{review.body}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                {review.author}
                {review.date && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <time dateTime={review.date}>{formatDate(review.date, locale)}</time>
                  </>
                )}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
