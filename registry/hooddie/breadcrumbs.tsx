import * as React from "react";

export interface BreadcrumbItem {
  label: string;
  /** Leave out for the current page, the last item. */
  href?: string;
}

export interface BreadcrumbsProps {
  /** The trail from the home page to the current page. The last item is the current page. */
  items: BreadcrumbItem[];
  /** The mark between items. Defaults to "chevron". */
  separator?: "chevron" | "slash";
  /** On small screens, show only the first and last items with "…" between them. Hidden items stay readable to screen readers and appear when tabbed to. Defaults to true. */
  collapse?: boolean;
  className?: string;
  /** Override the built-in English text. */
  labels?: { breadcrumb?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

function Separator({ kind }: { kind: "chevron" | "slash" }) {
  return kind === "slash" ? (
    <span aria-hidden="true" className="mx-1.5 text-muted-foreground">
      /
    </span>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

/** The path to the current page as a breadcrumb trail. On small screens the middle is shortened to "…", with CSS only. */
export function Breadcrumbs({ items, separator = "chevron", collapse = true, className, labels }: BreadcrumbsProps) {
  const text = { breadcrumb: "Breadcrumb", ...labels };
  const last = items.length - 1;
  // Only worth shortening when there is more than one item between the first and the last.
  const shorten = collapse && items.length > 3;
  const link = "inline-flex min-h-8 items-center rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <nav aria-label={text.breadcrumb} className={cx("min-w-0 text-sm text-muted-foreground", className)}>
      {/* Wraps onto a second line when the trail is too long; the shortened small-screen trail stays on one line and truncates the last item. */}
      <ol className={cx("flex min-w-0 items-center", shorten ? "sm:flex-wrap" : "flex-wrap")}>
        {items.map((item, i) => {
          const current = i === last;
          const middle = shorten && i > 0 && i < last;
          return (
            <React.Fragment key={`${i}-${item.label}`}>
              {shorten && i === 1 && (
                <li aria-hidden="true" className="flex shrink-0 items-center sm:hidden">
                  <Separator kind={separator} />
                  <span className="px-0.5">…</span>
                </li>
              )}
              <li
                className={cx(
                  "flex items-center",
                  current ? "min-w-0" : "shrink-0",
                  // Visually hidden rather than removed, so screen readers still hear the full trail. A focused link brings its item back.
                  middle && "sr-only focus-within:not-sr-only sm:not-sr-only",
                )}
              >
                {i > 0 && <Separator kind={separator} />}
                {current ? (
                  item.href ? (
                    <a href={item.href} aria-current="page" className={cx(link, "min-w-0 font-medium text-foreground")}>
                      <span className="truncate">{item.label}</span>
                    </a>
                  ) : (
                    <span aria-current="page" className="truncate font-medium text-foreground">
                      {item.label}
                    </span>
                  )
                ) : item.href ? (
                  <a href={item.href} className={link}>
                    {item.label}
                  </a>
                ) : (
                  <span>{item.label}</span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
