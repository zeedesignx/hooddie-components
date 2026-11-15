"use client";

import * as React from "react";

export interface MegaMenuLink {
  label: string;
  href: string;
  /** A short tag after the link, such as "New". */
  badge?: string;
}

export interface MegaMenuColumn {
  title: string;
  links: MegaMenuLink[];
}

export interface MegaMenuFeatured {
  title: string;
  href: string;
  image: string;
  /** Alt text for the photo. Defaults to empty, since the title is the link text. */
  imageAlt?: string;
  /** A line under the title, e.g. "New colours for winter". */
  caption?: string;
}

export interface MegaMenuItem {
  label: string;
  /** The section's own page. Without columns the item is a plain link; with columns it becomes a "Shop all" link in the panel. */
  href?: string;
  /** Link columns. Give an item columns to make it open a panel. */
  columns?: MegaMenuColumn[];
  /** A photo card at the end of the panel. */
  featured?: MegaMenuFeatured;
}

export interface MegaMenuProps {
  items: MegaMenuItem[];
  /** The label of the item whose panel is open on wide screens, or null when none is. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Whether the menu is open on small screens, where the items stack behind a "Menu" button. */
  menuOpen?: boolean;
  defaultMenuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  /** Open panels when the pointer rests on an item, not only on click. Defaults to false. */
  openOnHover?: boolean;
  /** How long the pointer has to rest before a panel opens or closes, in milliseconds. Defaults to 150. */
  hoverDelay?: number;
  /** The URL of the current page. The matching link is marked as the current page. */
  currentHref?: string;
  /** Blend the featured photo into the grey background. Use for packshots on white. */
  blend?: boolean;
  /** Shown at the start of the bar, e.g. your logo. Panels span the whole bar, so put the logo here rather than beside the menu. */
  start?: React.ReactNode;
  /** Shown at the end of the bar, e.g. search and bag buttons. */
  end?: React.ReactNode;
  className?: string;
  /** Override the built-in English text. */
  labels?: { navigation?: string; menu?: string; shopAll?: (label: string) => string };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("h-4 w-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none", open && "rotate-180")}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{children}</span>;
}

/** Store navigation: top items open full-width panels of link columns and a featured photo. Below the md breakpoint it becomes a "Menu" button with stacked sections. */
export function MegaMenu({
  items,
  value,
  defaultValue = null,
  onValueChange,
  menuOpen,
  defaultMenuOpen = false,
  onMenuOpenChange,
  openOnHover = false,
  hoverDelay = 150,
  currentHref,
  blend = false,
  start,
  end,
  className,
  labels,
}: MegaMenuProps) {
  const [internalValue, setInternalValue] = React.useState<string | null>(defaultValue);
  const [internalMenuOpen, setInternalMenuOpen] = React.useState(defaultMenuOpen);
  /** The open section in the small-screen menu. */
  const [section, setSection] = React.useState<string | null>(defaultValue);
  const rootRef = React.useRef<HTMLElement>(null);
  const topRefs = React.useRef<Array<HTMLElement | null>>([]);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const hoverTimer = React.useRef(0);
  /** When a panel last opened by hover, so the click that follows doesn't close it again. */
  const hoverOpenedAt = React.useRef(0);
  const id = React.useId();
  const text = { navigation: "Main", menu: "Menu", shopAll: (label: string) => `Shop all ${label}`, ...labels };
  const openLabel = value !== undefined ? value : internalValue;
  const isMenuOpen = menuOpen ?? internalMenuOpen;

  const setOpenLabel = (next: string | null) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };
  const setMenuOpen = (next: boolean) => {
    if (menuOpen === undefined) setInternalMenuOpen(next);
    onMenuOpenChange?.(next);
  };
  const panelId = (index: number) => `${id}-panel-${index}`;
  const sectionId = (index: number) => `${id}-section-${index}`;

  React.useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // A press outside the navigation closes whatever is open.
  React.useEffect(() => {
    if (openLabel === null && !isMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || rootRef.current?.contains(event.target)) return;
      if (openLabel !== null) setOpenLabel(null);
      if (isMenuOpen) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLabel, isMenuOpen]);

  const onTopKeyDown = (event: React.KeyboardEvent, index: number) => {
    const elements = topRefs.current.filter(Boolean) as HTMLElement[];
    const position = elements.indexOf(topRefs.current[index]!);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (position + 1) % elements.length;
    else if (event.key === "ArrowLeft") next = (position - 1 + elements.length) % elements.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = elements.length - 1;
    else if (event.key === "ArrowDown" && items[index].columns?.length) {
      event.preventDefault();
      setOpenLabel(items[index].label);
      // The panel renders on this pass; focus its first link on the next frame.
      requestAnimationFrame(() => document.getElementById(panelId(index))?.querySelector<HTMLElement>("a")?.focus());
      return;
    }
    if (next === null) return;
    event.preventDefault();
    elements[next]?.focus();
  };

  // Up and Down move between the links of an open panel; Escape closes it and returns to its button.
  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === "Escape") {
      // Stop here so a surrounding dialog doesn't close on the same key.
      event.preventDefault();
      event.stopPropagation();
      setOpenLabel(null);
      topRefs.current[index]?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a"));
    const at = links.indexOf(document.activeElement as HTMLElement);
    if (at === -1) return;
    event.preventDefault();
    links[(at + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length]?.focus();
  };

  const hover = (label: string | null) => {
    if (!openOnHover) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      if (label !== null && label !== openLabel) hoverOpenedAt.current = Date.now();
      setOpenLabel(label);
    }, hoverDelay);
  };

  const current = (href?: string) => (href !== undefined && href === currentHref ? ("page" as const) : undefined);

  const columnsOf = (item: MegaMenuItem, index: number, compact: boolean) => (
    <>
      {item.href && (
        <a
          href={item.href}
          aria-current={current(item.href)}
          className={cx("inline-flex min-h-8 items-center rounded-sm text-sm font-semibold underline-offset-4 hover:underline", ring, compact ? "mb-3" : "mb-6")}
        >
          {text.shopAll(item.label)}
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5 h-4 w-4">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      )}
      <div className={cx("grid gap-x-8", compact ? "gap-y-5 sm:grid-cols-2" : "grid-cols-2 gap-y-8 lg:grid-cols-3")}>
        {item.columns?.map((column, c) => {
          const titleId = `${id}-${compact ? "m" : "d"}-${index}-${c}`;
          return (
            <div key={column.title}>
              <p id={titleId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {column.title}
              </p>
              <ul aria-labelledby={titleId} className="mt-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      aria-current={current(link.href)}
                      className={cx("inline-flex min-h-8 items-center rounded-sm text-sm hover:underline underline-offset-4 aria-[current=page]:font-semibold", compact && "min-h-11", ring)}
                    >
                      {link.label}
                      {link.badge && <Badge>{link.badge}</Badge>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );

  const featuredOf = (featured: MegaMenuFeatured) => (
    <a href={featured.href} className={cx("group block rounded-lg", ring, "focus-visible:ring-offset-2")}>
      <span className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-muted">
        <img
          src={featured.image}
          alt={featured.imageAlt ?? ""}
          loading="lazy"
          className={cx(
            "absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            blend && "mix-blend-multiply dark:mix-blend-normal",
          )}
        />
      </span>
      <span className="mt-3 block text-sm font-semibold group-hover:underline underline-offset-4">{featured.title}</span>
      {featured.caption && <span className="mt-0.5 block text-sm text-muted-foreground">{featured.caption}</span>}
    </a>
  );

  return (
    <nav
      ref={rootRef}
      aria-label={text.navigation}
      onBlur={(event) => {
        // Tabbing out of the navigation closes whatever is open, so nothing covers the newly focused control.
        if (!(event.relatedTarget instanceof Node) || event.currentTarget.contains(event.relatedTarget)) return;
        if (openLabel !== null) setOpenLabel(null);
        if (isMenuOpen) setMenuOpen(false);
      }}
      className={cx("relative text-foreground", className)}
    >
      <div className="flex min-h-16 items-center gap-2 md:gap-6">
        {/* Small screens: one "Menu" button over stacked sections. */}
        <div
          className="shrink-0 md:hidden"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !isMenuOpen) return;
            event.preventDefault();
            event.stopPropagation();
            setMenuOpen(false);
            menuButtonRef.current?.focus();
          }}
        >
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls={`${id}-menu`}
            onClick={() => setMenuOpen(!isMenuOpen)}
            className={cx("inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground", ring)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              {isMenuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
            {text.menu}
          </button>
          <div
            id={`${id}-menu`}
            hidden={!isMenuOpen}
            className="absolute inset-x-0 top-full z-40 mt-2 max-h-[75vh] overflow-y-auto overscroll-contain rounded-lg border border-border bg-background shadow-lg"
          >
            <ul className="divide-y divide-border">
              {items.map((item, index) => {
                const hasPanel = Boolean(item.columns?.length);
                const expanded = hasPanel && section === item.label;
                return (
                  <li key={item.label}>
                    {hasPanel ? (
                      <>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={sectionId(index)}
                          onClick={() => setSection(expanded ? null : item.label)}
                          className={cx("flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left text-base font-medium", ring, "focus-visible:ring-inset")}
                        >
                          {item.label}
                          <Chevron open={expanded} />
                        </button>
                        <div id={sectionId(index)} hidden={!expanded} className="px-4 pb-5">
                          {columnsOf(item, index, true)}
                          {item.featured && <div className="mt-5 max-w-xs">{featuredOf(item.featured)}</div>}
                        </div>
                      </>
                    ) : (
                      <a href={item.href ?? "#"} aria-current={current(item.href)} className={cx("flex min-h-12 items-center px-4 text-base font-medium", ring, "focus-visible:ring-inset")}>
                        {item.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        {start && <div className="flex shrink-0 items-center">{start}</div>}
        {/* Wide screens: a row of items, each panel spanning the full width of the navigation. */}
        <ul className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
          {items.map((item, index) => {
            const hasPanel = Boolean(item.columns?.length);
            const open = hasPanel && openLabel === item.label;
            const top = cx(
              "inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors duration-150 hover:bg-accent hover:text-accent-foreground motion-reduce:transition-none",
              ring,
              open && "bg-accent text-accent-foreground",
            );
            return (
              <li
                key={item.label}
                onPointerEnter={(event) => event.pointerType === "mouse" && hover(hasPanel ? item.label : null)}
                onPointerLeave={(event) => event.pointerType === "mouse" && hover(null)}
              >
                {hasPanel ? (
                  <>
                    <button
                      ref={(node) => {
                        topRefs.current[index] = node;
                      }}
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId(index)}
                      onClick={() => {
                        if (open && Date.now() - hoverOpenedAt.current < 500) return;
                        setOpenLabel(open ? null : item.label);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape" && open) {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenLabel(null);
                          return;
                        }
                        onTopKeyDown(event, index);
                      }}
                      className={top}
                    >
                      {item.label}
                      <Chevron open={open} />
                    </button>
                    <div
                      id={panelId(index)}
                      hidden={!open}
                      onKeyDown={(event) => onPanelKeyDown(event, index)}
                      className="absolute inset-x-0 top-full z-40 mt-2 rounded-lg border border-border bg-background p-8 shadow-lg"
                    >
                      <div className="flex gap-10">
                        <div className="min-w-0 flex-1">{columnsOf(item, index, false)}</div>
                        {item.featured && <div className="w-48 shrink-0 lg:w-60">{featuredOf(item.featured)}</div>}
                      </div>
                    </div>
                  </>
                ) : (
                  <a
                    ref={(node) => {
                      topRefs.current[index] = node;
                    }}
                    href={item.href ?? "#"}
                    aria-current={current(item.href)}
                    onKeyDown={(event) => onTopKeyDown(event, index)}
                    className={top}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        {end && <div className="ml-auto flex shrink-0 items-center gap-1">{end}</div>}
      </div>
    </nav>
  );
}
