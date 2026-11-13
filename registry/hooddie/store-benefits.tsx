import * as React from "react";

export type StoreBenefitIcon = "shipping" | "returns" | "secure" | "support" | "gift" | "eco";

export interface StoreBenefit {
  /** Which built-in icon to draw. */
  icon: StoreBenefitIcon;
  /** The promise itself, e.g. "Free shipping over €75". */
  title: string;
  /** One short line under the title, e.g. "Delivered in 2–4 working days". */
  text?: string;
}

export interface StoreBenefitsProps {
  /** Three or four promises read best. They sit two to a row on phones and all in one row from large screens. */
  items: StoreBenefit[];
  /** "compact" is a quiet row with the icon beside the text, for under a header or above a footer. "card" puts each promise in its own bordered card. Defaults to "compact". */
  variant?: "compact" | "card";
  className?: string;
  /** Override the built-in English text. `list` names the list for screen readers. */
  labels?: { list?: string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/** Every icon is drawn on the same 24px grid with the same 1.5 stroke, so a row of them looks like one set. */
const paths: Record<StoreBenefitIcon, React.ReactNode> = {
  shipping: (
    <>
      <path d="M2.75 6.25h11v9.5h-11z" />
      <path d="M13.75 9.25h3.6l3.9 3.9v2.6h-7.5" />
      <circle cx="7" cy="17.75" r="1.75" />
      <circle cx="17" cy="17.75" r="1.75" />
    </>
  ),
  returns: (
    <>
      <path d="M3.75 12a8.25 8.25 0 1 0 2.42-5.83L3.75 8.5" />
      <path d="M3.75 4v4.5h4.5" />
    </>
  ),
  secure: (
    <>
      <rect x="4.75" y="10.25" width="14.5" height="10" rx="2" />
      <path d="M8 10.25V7.5a4 4 0 0 1 8 0v2.75" />
      <path d="M12 14.25v2" />
    </>
  ),
  support: (
    <>
      <path d="M4.75 5.75a1.5 1.5 0 0 1 1.5-1.5h11.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H10l-5.25 3.75z" />
      <path d="M8.5 9h7M8.5 12.25h4.5" />
    </>
  ),
  gift: (
    <>
      <path d="M3.75 8.25h16.5v4H3.75z" />
      <path d="M5.25 12.25v7.5h13.5v-7.5" />
      <path d="M12 8.25v11.5" />
      <path d="M12 8.25C10.5 4.75 7.25 4.5 7.25 6.5c0 1.5 2.5 1.75 4.75 1.75zm0 0c1.5-3.5 4.75-3.75 4.75-1.75 0 1.5-2.5 1.75-4.75 1.75z" />
    </>
  ),
  eco: (
    <>
      <path d="M5.25 18.75C4.75 10.5 9.75 5.25 19.25 4.75c.5 9.5-4.75 14.5-14 14z" />
      <path d="M4.25 19.75l9-9" />
    </>
  ),
};

function BenefitIcon({ icon, className }: { icon: StoreBenefitIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[icon]}
    </svg>
  );
}

/** A row of short store promises, such as free shipping, free returns and secure payment, each with a matching icon. */
export function StoreBenefits({ items, variant = "compact", className, labels }: StoreBenefitsProps) {
  const text = { list: "Why shop with us", ...labels };
  const card = variant === "card";

  return (
    <ul
      aria-label={text.list}
      className={cx(
        "grid grid-cols-2 text-foreground",
        items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        card ? "gap-3 sm:gap-4" : "gap-x-4 gap-y-6 sm:gap-x-6",
        className,
      )}
    >
      {items.map((item) => (
        <li
          key={`${item.icon}-${item.title}`}
          className={cx(
            "flex min-w-0",
            card ? "flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5" : "flex-col gap-2 sm:flex-row sm:items-start sm:gap-3",
          )}
        >
          <span className={cx("flex shrink-0 items-center justify-center", card ? "h-10 w-10 rounded-full bg-secondary text-secondary-foreground" : "h-6 w-6")}>
            <BenefitIcon icon={item.icon} className={card ? "h-5 w-5" : "h-6 w-6"} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">{item.title}</p>
            {item.text && <p className="mt-1 text-sm leading-snug text-muted-foreground">{item.text}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
