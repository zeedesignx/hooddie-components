import * as React from "react";

export interface CollectionHeaderProps {
  title: string;
  /** The heading level. Defaults to "h1", the page title. Use "h2" when the page already has one. */
  as?: "h1" | "h2";
  /** A sentence or two about the collection. */
  description?: React.ReactNode;
  /** How many products the collection has, shown as "24 products". Leave out to hide it. */
  productCount?: number;
  /** A photo for the collection. */
  image?: string;
  /** Alt text for the photo. Defaults to empty, since the title already names the collection. */
  imageAlt?: string;
  /** "side" puts the photo beside the text (above it on small screens), "cover" puts it behind the text with a dark scrim. Defaults to "side". */
  imageLayout?: "side" | "cover";
  /** How the photo fills its frame in the "side" layout. Use "contain" for packshots. Defaults to "cover". */
  imageFit?: "cover" | "contain";
  /** The photo's focal point as a CSS object-position, e.g. "50% 20%". Defaults to the centre. */
  imagePosition?: string;
  /** Blend the photo into the grey background. Use for packshots on white. */
  blend?: boolean;
  /** Locale for the product count. Defaults to "en" so server and browser agree; pass the store's locale. */
  locale?: string;
  /** Rendered above the title, e.g. breadcrumbs. In the "cover" layout it sits on the dark scrim, so give it light text. */
  children?: React.ReactNode;
  className?: string;
  /** Override the built-in English text. */
  labels?: { products?: (count: number, formatted: string) => string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/** The top of a category page: title, short description, product count and an optional photo beside or behind the text. */
export function CollectionHeader({
  title,
  as: Heading = "h1",
  description,
  productCount,
  image,
  imageAlt = "",
  imageLayout = "side",
  imageFit = "cover",
  imagePosition,
  blend = false,
  locale = "en",
  children,
  className,
  labels,
}: CollectionHeaderProps) {
  const text = {
    products: (count: number, formatted: string) => `${formatted} ${count === 1 ? "product" : "products"}`,
    ...labels,
  };
  const cover = Boolean(image) && imageLayout === "cover";
  const count = productCount !== undefined ? text.products(productCount, new Intl.NumberFormat(locale).format(productCount)) : null;

  const body = (
    <div className={cx("flex min-w-0 flex-col gap-3", cover && "relative max-w-2xl")}>
      {children}
      <Heading className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</Heading>
      {description && <div className={cx("max-w-prose text-base leading-relaxed", cover ? "text-white" : "text-muted-foreground")}>{description}</div>}
      {count && <p className={cx("text-sm font-medium", cover ? "text-white" : "text-muted-foreground")}>{count}</p>}
    </div>
  );

  if (cover) {
    return (
      <div className={cx("relative isolate flex min-h-64 items-end overflow-hidden rounded-lg bg-muted p-6 text-white sm:min-h-80 sm:p-10", className)}>
        <img src={image} alt={imageAlt} style={{ objectPosition: imagePosition }} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        {/* A flat scrim keeps white text above 4.5:1 over even the lightest photo. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/60" />
        {body}
      </div>
    );
  }

  return (
    <div className={cx("grid gap-6 text-foreground", image && "md:grid-cols-2 md:items-center md:gap-10", className)}>
      {body}
      {image && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted md:aspect-[4/3]">
          <img
            src={image}
            alt={imageAlt}
            style={{ objectPosition: imagePosition }}
            className={cx("absolute inset-0 h-full w-full", imageFit === "contain" ? "object-contain p-4" : "object-cover", blend && "mix-blend-multiply dark:mix-blend-normal")}
          />
        </div>
      )}
    </div>
  );
}
