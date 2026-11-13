"use client";

import * as React from "react";

export type SizeFinderFitPreference = "snug" | "regular" | "relaxed";

/** What the shopper told us. Always metric, whatever units they typed in. */
export interface SizeFinderAnswers {
  /** Height in centimetres. */
  height: number;
  /** Weight in kilograms. */
  weight: number;
  fit: SizeFinderFitPreference;
  /** The size they usually wear in other brands, if they picked one. */
  usualSize?: string;
}

export interface SizeFinderResult {
  size: string;
  /** How the size will feel: "tight" (at the top of the size), "true" or "loose" (at the bottom). */
  fit?: "tight" | "true" | "loose";
  /** 0 to 1. Shown as "Good match", "Fair match" or "Rough guide". */
  confidence?: number;
  /** An extra line under the explanation, e.g. "Most people with your build chose M." */
  note?: string;
  /** Where the shopper sits on the size scale, as a fractional index into `sizes`: 2.3 is a little above the third size. Drawn on the fit scale. */
  position?: number;
}

/** One size in the built-in chart. Ranges are body measurements, [from, to], in cm and kg. */
export interface SizeFinderChartRow {
  size: string;
  height?: [number, number];
  weight?: [number, number];
}

export interface SizeFinderSize {
  value: string;
  /** False says the recommended size is sold out and blocks "Use this size". Defaults to true. */
  available?: boolean;
}

export type SizeFinderUnits = "metric" | "imperial";

export interface SizeFinderProps {
  /** Your own sizing logic or service. Without it, the component recommends from `sizeChart`. Return a promise to show "Finding your size…". */
  recommend?: (answers: SizeFinderAnswers) => SizeFinderResult | Promise<SizeFinderResult>;
  /** Body ranges per size, smallest first. Used when `recommend` is not passed, and for the size order on the fit scale. */
  sizeChart?: SizeFinderChartRow[];
  /** The sizes, smallest first, with stock. Fills the "usual size" list and the fit scale. Defaults to the sizes in `sizeChart`. */
  sizes?: SizeFinderSize[];
  /** Called with the size when the shopper presses "Use this size", e.g. to pick it in your variant picker. */
  onApply?: (size: string) => void;
  /** Answers to start with, e.g. ones the shopper gave last time. */
  defaultAnswers?: Partial<SizeFinderAnswers>;
  /** The units the form starts in. Defaults to "metric". */
  defaultUnits?: SizeFinderUnits;
  /** Show the form behind a "Find my size" button. Defaults to true. False shows it inline. */
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Override the built-in English text. */
  labels?: Partial<typeof defaultLabels>;
}

const defaultLabels = {
  trigger: "Find my size",
  title: "Find your size",
  intro: "Three quick questions. We'll match you to our size chart.",
  height: "Height",
  weight: "Weight",
  cm: "cm",
  ftIn: "ft/in",
  kg: "kg",
  lb: "lb",
  heightUnit: "Height unit",
  weightUnit: "Weight unit",
  centimetres: "Height in centimetres",
  feet: "Feet",
  inches: "Inches",
  ft: "ft",
  in: "in",
  kilograms: "Weight in kilograms",
  pounds: "Weight in pounds",
  invalidHeight: (units: SizeFinderUnits) => (units === "metric" ? "Enter your height in cm, between 100 and 250." : "Enter your height in feet and inches, e.g. 5 ft 10 in."),
  invalidWeight: (units: SizeFinderUnits) => (units === "metric" ? "Enter your weight in kg, between 30 and 250." : "Enter your weight in lb, between 66 and 550."),
  fit: "How do you like it to fit?",
  fits: {
    snug: ["Snug", "Close to the body"],
    regular: ["Regular", "As designed"],
    relaxed: ["Relaxed", "Room to layer"],
  } as Record<SizeFinderFitPreference, [string, string]>,
  usualSize: "Your usual size in other brands",
  optional: "optional",
  notSure: "Not sure",
  submit: "Find my size",
  busy: "Finding your size…",
  error: "We couldn't work out a size just now. Please try again.",
  recommend: "We recommend",
  reason: (size: string, fit: SizeFinderResult["fit"], smaller?: string, larger?: string) =>
    fit === "tight"
      ? `You're at the top of ${size}, so it will fit a little closer than you asked for.${larger ? ` Choose ${larger} for more room.` : ""}`
      : fit === "loose"
        ? `You're at the bottom of ${size}, so it will feel a little roomier.${smaller ? ` Choose ${smaller} for a closer fit.` : ""}`
        : fit === "true"
          ? `You're right in the middle of ${size}, so it should fit the way you like.`
          : `Based on your answers, ${size} is your best fit.`,
  confidence: (confidence: number) => (confidence >= 0.75 ? "Good match" : confidence >= 0.5 ? "Fair match" : "Rough guide"),
  scale: "Where you sit between sizes",
  soldOut: (size: string) => `${size} is sold out at the moment.`,
  apply: (size: string) => `Use size ${size}`,
  applied: (size: string) => `Size ${size} selected`,
  edit: "Change answers",
};

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const field = cx("h-11 w-full rounded-md border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground aria-[invalid=true]:border-destructive", ring);
const KG_PER_LB = 0.45359237;

/** Centimetres to whole feet and inches, carrying 12 inches over to the next foot. */
const toFeetInches = (cm: number) => {
  const total = Math.round(cm / 2.54);
  return { feet: Math.floor(total / 12), inches: total % 12 };
};

const num = (value: string) => {
  const parsed = parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
};

/** Where `value` falls on the chart, as a fractional size index: 2 is the middle of the third size. */
const placeOn = (value: number, rows: Array<{ index: number; range: [number, number] }>) => {
  if (!rows.length) return undefined;
  for (let i = 0; i < rows.length; i++) {
    const { index, range } = rows[i];
    const [from, to] = range;
    const span = Math.max(to - from, 1);
    if (value < from) {
      if (i === 0) return index - 0.5 - (from - value) / span;
      return (rows[i - 1].index + index) / 2;
    }
    if (value <= to) return index - 0.5 + (value - from) / span;
  }
  const last = rows[rows.length - 1];
  return last.index + 0.5 + (value - last.range[1]) / Math.max(last.range[1] - last.range[0], 1);
};

/** The built-in recommendation: places height and weight on the chart, leans on weight, then adjusts for fit and usual size. */
const fromChart = (chart: SizeFinderChartRow[], answers: SizeFinderAnswers): SizeFinderResult => {
  const rowsFor = (key: "height" | "weight") =>
    chart.flatMap((row, index) => (row[key] ? [{ index, range: row[key] as [number, number] }] : []));
  const byHeight = placeOn(answers.height, rowsFor("height"));
  const byWeight = placeOn(answers.weight, rowsFor("weight"));
  if (byHeight === undefined && byWeight === undefined) throw new Error("The size chart has no height or weight ranges.");
  let position = byHeight === undefined ? byWeight! : byWeight === undefined ? byHeight : byHeight * 0.4 + byWeight * 0.6;
  position += answers.fit === "snug" ? -0.3 : answers.fit === "relaxed" ? 0.3 : 0;
  const usual = chart.findIndex((row) => row.size === answers.usualSize);
  if (usual !== -1) position = position * 0.75 + usual * 0.25;
  const index = Math.min(chart.length - 1, Math.max(0, Math.round(position)));
  const offset = position - index;
  const disagreement = byHeight !== undefined && byWeight !== undefined ? Math.abs(byHeight - byWeight) : 0;
  const outside = Math.abs(offset) > 0.5 ? 0.3 : 0;
  const confidence = Math.max(0.2, Math.min(1, 1 - Math.abs(offset) * 0.6 - Math.min(0.35, disagreement * 0.2) - outside));
  return { size: chart[index].size, fit: offset > 0.2 ? "tight" : offset < -0.2 ? "loose" : "true", confidence, position };
};

type Step = "form" | "busy" | "result";

/** A short size quiz: height, weight, fit preference and usual size in, a recommended size out, with how close the fit is and why. */
export function SizeFinder({
  recommend,
  sizeChart,
  sizes,
  onApply,
  defaultAnswers,
  defaultUnits = "metric",
  collapsible = true,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  labels,
}: SizeFinderProps) {
  const text = { ...defaultLabels, ...labels };
  const id = React.useId();
  const [openState, setOpenState] = React.useState(defaultOpen);
  const isOpen = !collapsible || (open ?? openState);
  const [heightUnits, setHeightUnits] = React.useState<SizeFinderUnits>(defaultUnits);
  const [weightUnits, setWeightUnits] = React.useState<SizeFinderUnits>(defaultUnits);

  const startHeight = defaultAnswers?.height;
  const startWeight = defaultAnswers?.weight;
  const [cm, setCm] = React.useState(startHeight ? String(Math.round(startHeight)) : "");
  const [ft, setFt] = React.useState(startHeight ? String(toFeetInches(startHeight).feet) : "");
  const [inch, setInch] = React.useState(startHeight ? String(toFeetInches(startHeight).inches) : "");
  const [kg, setKg] = React.useState(startWeight ? String(Math.round(startWeight)) : "");
  const [lb, setLb] = React.useState(startWeight ? String(Math.round(startWeight / KG_PER_LB)) : "");
  const [fit, setFit] = React.useState<SizeFinderFitPreference>(defaultAnswers?.fit ?? "regular");
  const [usualSize, setUsualSize] = React.useState(defaultAnswers?.usualSize ?? "");

  const [errors, setErrors] = React.useState<{ height?: string; weight?: string }>({});
  const [failed, setFailed] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [result, setResult] = React.useState<SizeFinderResult | null>(null);
  const [applied, setApplied] = React.useState<string | null>(null);
  const resultRef = React.useRef<HTMLHeadingElement>(null);
  const firstFieldRef = React.useRef<HTMLInputElement>(null);
  const weightRef = React.useRef<HTMLInputElement>(null);
  const focusNext = React.useRef<"result" | "form" | null>(null);

  const sizeList: SizeFinderSize[] = sizes ?? (sizeChart ?? []).map((row) => ({ value: row.size }));

  React.useEffect(() => {
    if (focusNext.current === "result") resultRef.current?.focus();
    if (focusNext.current === "form") firstFieldRef.current?.focus();
    focusNext.current = null;
  }, [step]);

  const setOpen = (next: boolean) => {
    if (open === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  // Switching units converts what was typed, so nobody has to type it twice.
  const switchHeight = (next: SizeFinderUnits) => {
    if (next === heightUnits) return;
    if (next === "imperial" && Number.isFinite(num(cm))) {
      const { feet, inches } = toFeetInches(num(cm));
      setFt(String(feet));
      setInch(String(inches));
    }
    if (next === "metric" && Number.isFinite(num(ft))) setCm(String(Math.round((num(ft) * 12 + (num(inch) || 0)) * 2.54)));
    setHeightUnits(next);
    setErrors((e) => ({ ...e, height: undefined }));
  };
  const switchWeight = (next: SizeFinderUnits) => {
    if (next === weightUnits) return;
    if (next === "imperial" && Number.isFinite(num(kg))) setLb(String(Math.round(num(kg) / KG_PER_LB)));
    if (next === "metric" && Number.isFinite(num(lb))) setKg(String(Math.round(num(lb) * KG_PER_LB)));
    setWeightUnits(next);
    setErrors((e) => ({ ...e, weight: undefined }));
  };

  const readHeight = () => {
    if (heightUnits === "metric") {
      const value = num(cm);
      return value >= 100 && value <= 250 ? value : undefined;
    }
    const feet = num(ft);
    const inches = inch.trim() === "" ? 0 : num(inch);
    if (!(feet >= 3 && feet <= 8) || !(inches >= 0 && inches < 12)) return undefined;
    return (feet * 12 + inches) * 2.54;
  };
  const readWeight = () => {
    // Checked in the unit the shopper typed, so the limits match the error message exactly.
    if (weightUnits === "metric") {
      const value = num(kg);
      return value >= 30 && value <= 250 ? value : undefined;
    }
    const pounds = num(lb);
    return pounds >= 66 && pounds <= 550 ? pounds * KG_PER_LB : undefined;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "busy") return;
    const height = readHeight();
    const weight = readWeight();
    const nextErrors = {
      height: height === undefined ? text.invalidHeight(heightUnits) : undefined,
      weight: weight === undefined ? text.invalidWeight(weightUnits) : undefined,
    };
    setErrors(nextErrors);
    setFailed(false);
    if (height === undefined || weight === undefined) {
      if (height === undefined) firstFieldRef.current?.focus();
      else weightRef.current?.focus();
      return;
    }
    const answers: SizeFinderAnswers = { height: Math.round(height), weight: Math.round(weight * 10) / 10, fit, usualSize: usualSize || undefined };
    setStep("busy");
    try {
      const next = recommend ? await recommend(answers) : fromChart(sizeChart ?? [], answers);
      setResult(next);
      setApplied(null);
      focusNext.current = "result";
      setStep("result");
    } catch {
      setFailed(true);
      setStep("form");
    }
  };

  const unitToggle = (label: string, current: SizeFinderUnits, onPick: (units: SizeFinderUnits) => void, metric: string, imperial: string) => (
    <div role="group" aria-label={label} className="flex gap-1 rounded-md border border-border p-0.5">
      {(["metric", "imperial"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={current === option}
          onClick={() => onPick(option)}
          className={cx(
            "h-8 min-w-[2.75rem] rounded px-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            current === option ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {option === "metric" ? metric : imperial}
        </button>
      ))}
    </div>
  );

  const withSuffix = (input: React.ReactNode, suffix: string) => (
    <div className="relative flex-1">
      {input}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{suffix}</span>
    </div>
  );

  const renderForm = () => (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{text.intro}</p>

      <fieldset>
        <legend className="float-left text-sm font-medium leading-10">{text.height}</legend>
        <div className="flex justify-end">{unitToggle(text.heightUnit, heightUnits, switchHeight, text.cm, text.ftIn)}</div>
        <div className="clear-both mt-2 flex flex-col gap-2">
          {heightUnits === "metric" ? (
            withSuffix(
              <input
                ref={firstFieldRef}
                type="text"
                inputMode="numeric"
                enterKeyHint="next"
                autoComplete="off"
                aria-label={text.centimetres}
                aria-invalid={errors.height ? true : undefined}
                aria-describedby={errors.height ? `${id}-height-error` : undefined}
                placeholder="175"
                value={cm}
                onChange={(e) => setCm(e.target.value)}
                className={cx(field, "pr-12")}
              />,
              text.cm,
            )
          ) : (
            <div className="flex gap-3">
              {withSuffix(
                <input
                  ref={firstFieldRef}
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="next"
                  autoComplete="off"
                  aria-label={text.feet}
                  aria-invalid={errors.height ? true : undefined}
                  aria-describedby={errors.height ? `${id}-height-error` : undefined}
                  placeholder="5"
                  value={ft}
                  onChange={(e) => setFt(e.target.value)}
                  className={cx(field, "pr-10")}
                />,
                text.ft,
              )}
              {withSuffix(
                <input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="next"
                  autoComplete="off"
                  aria-label={text.inches}
                  aria-invalid={errors.height ? true : undefined}
                  aria-describedby={errors.height ? `${id}-height-error` : undefined}
                  placeholder="10"
                  value={inch}
                  onChange={(e) => setInch(e.target.value)}
                  className={cx(field, "pr-10")}
                />,
                text.in,
              )}
            </div>
          )}
          {errors.height && <p id={`${id}-height-error`} className="text-sm text-destructive">{errors.height}</p>}
        </div>
      </fieldset>

      <fieldset>
        <legend className="float-left text-sm font-medium leading-10">{text.weight}</legend>
        <div className="flex justify-end">{unitToggle(text.weightUnit, weightUnits, switchWeight, text.kg, text.lb)}</div>
        <div className="clear-both mt-2 flex flex-col gap-2">
          {withSuffix(
            <input
              ref={weightRef}
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              autoComplete="off"
              aria-label={weightUnits === "metric" ? text.kilograms : text.pounds}
              aria-invalid={errors.weight ? true : undefined}
              aria-describedby={errors.weight ? `${id}-weight-error` : undefined}
              placeholder={weightUnits === "metric" ? "75" : "165"}
              value={weightUnits === "metric" ? kg : lb}
              onChange={(e) => (weightUnits === "metric" ? setKg : setLb)(e.target.value)}
              className={cx(field, "pr-12")}
            />,
            weightUnits === "metric" ? text.kg : text.lb,
          )}
          {errors.weight && <p id={`${id}-weight-error`} className="text-sm text-destructive">{errors.weight}</p>}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{text.fit}</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["snug", "regular", "relaxed"] as const).map((option) => {
            const [name, hint] = text.fits[option];
            const checked = fit === option;
            return (
              <label
                key={option}
                className={cx(
                  "relative flex min-h-[4rem] cursor-pointer flex-col justify-center rounded-md border px-2 py-2 text-center transition-colors duration-150 motion-reduce:transition-none",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                  checked ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground",
                )}
              >
                <input type="radio" name={`${id}-fit`} value={option} checked={checked} onChange={() => setFit(option)} className="sr-only" />
                <span className="text-sm font-medium">{name}</span>
                <span className={cx("mt-0.5 text-xs", checked ? "text-primary-foreground" : "text-muted-foreground")}>{hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {sizeList.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-usual`} className="text-sm font-medium">
            {text.usualSize} <span className="font-normal text-muted-foreground">({text.optional})</span>
          </label>
          <select id={`${id}-usual`} value={usualSize} onChange={(e) => setUsualSize(e.target.value)} className={cx(field, "cursor-pointer")}>
            <option value="">{text.notSure}</option>
            {sizeList.map((size) => (
              <option key={size.value} value={size.value}>
                {size.value}
              </option>
            ))}
          </select>
        </div>
      )}

      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {text.error}
        </p>
      )}

      <button
        type="submit"
        aria-busy={step === "busy" || undefined}
        className={cx(
          "flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90 motion-reduce:transition-none",
          step === "busy" && "cursor-progress",
          ring,
        )}
      >
        {step === "busy" && (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 animate-spin motion-reduce:animate-none">
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        )}
        {step === "busy" ? text.busy : text.submit}
      </button>
    </form>
  );

  const renderResult = (res: SizeFinderResult) => {
    const index = sizeList.findIndex((size) => size.value === res.size);
    const smaller = index > 0 ? sizeList[index - 1].value : undefined;
    const larger = index !== -1 && index < sizeList.length - 1 ? sizeList[index + 1].value : undefined;
    const soldOut = index !== -1 && sizeList[index].available === false;
    const position = res.position ?? (index === -1 ? undefined : index + (res.fit === "tight" ? 0.3 : res.fit === "loose" ? -0.3 : 0));
    // The scale shows the recommended size with its neighbours, and the shopper's spot between them.
    const from = Math.max(0, index - 1);
    const to = Math.min(sizeList.length - 1, index + 1);
    const ticks = index === -1 ? [] : sizeList.slice(from, to + 1);
    const spanStart = from - 0.5;
    const spanEnd = to + 0.5;
    const marker = position === undefined ? undefined : Math.min(100, Math.max(0, ((position - spanStart) / (spanEnd - spanStart)) * 100));
    const isApplied = applied === res.size;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{text.recommend}</p>
            <h3 ref={resultRef} tabIndex={-1} className="mt-1 text-4xl font-semibold tracking-tight outline-none">
              <span className="sr-only">{text.recommend} </span>
              {res.size}
            </h3>
          </div>
          {res.confidence !== undefined && (
            <span className="mt-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium">{text.confidence(res.confidence)}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <p>{text.reason(res.size, res.fit, smaller, larger)}</p>
          {res.note && <p className="text-muted-foreground">{res.note}</p>}
          {soldOut && <p className="font-medium text-amber-700">{text.soldOut(res.size)}</p>}
        </div>

        {ticks.length > 1 && marker !== undefined && (
          <div>
            <p className="sr-only">{text.scale}</p>
            <div aria-hidden="true" className="px-1">
              <div className="relative h-2 rounded-full bg-muted">
                <span
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
                  style={{ left: `${marker}%` }}
                />
              </div>
              <div className="mt-2 flex">
                {ticks.map((size) => (
                  <span key={size.value} className={cx("flex-1 text-center text-xs", size.value === res.size ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {size.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            aria-disabled={soldOut || undefined}
            onClick={() => {
              if (soldOut) return;
              setApplied(res.size);
              onApply?.(res.size);
            }}
            className={cx(
              "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none",
              soldOut ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90",
              ring,
            )}
          >
            {isApplied && (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            )}
            {isApplied ? text.applied(res.size) : text.apply(res.size)}
          </button>
          <button
            type="button"
            onClick={() => {
              focusNext.current = "form";
              setStep("form");
            }}
            className={cx("flex min-h-12 items-center justify-center rounded-md border border-border px-5 text-sm font-medium hover:bg-accent hover:text-accent-foreground", ring)}
          >
            {text.edit}
          </button>
        </div>
        <p role="status" className="sr-only">{isApplied ? text.applied(res.size) : ""}</p>
      </div>
    );
  };

  const panel = (
    <div id={`${id}-panel`} className={cx("rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6", collapsible && "mt-3")}>
      {!collapsible && <h2 className="mb-1 text-lg font-semibold">{text.title}</h2>}
      {step === "result" && result ? renderResult(result) : renderForm()}
    </div>
  );

  if (!collapsible) return <div className={cx("w-full text-foreground", className)}>{panel}</div>;

  return (
    <div className={cx("w-full text-foreground", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen(!isOpen)}
        className={cx("inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium underline underline-offset-4 hover:no-underline", ring)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M3 15.5 15.5 3 21 8.5 8.5 21z" />
          <path d="m7 11.5 1.5 1.5M10 8.5l1.5 1.5M13 5.5l1.5 1.5" />
        </svg>
        {text.trigger}
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cx("h-4 w-4 transition-transform duration-150 motion-reduce:transition-none", isOpen && "rotate-180")}>
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {isOpen && panel}
    </div>
  );
}
