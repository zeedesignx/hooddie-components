"use client";

import * as React from "react";

export interface Address {
  email?: string;
  firstName: string;
  lastName: string;
  company?: string;
  /** Street and house number. */
  address1: string;
  /** Apartment, floor, c/o. */
  address2?: string;
  postcode: string;
  city: string;
  /** State, province or county. */
  region?: string;
  /** ISO 3166-1 alpha-2 code from `countries`, e.g. "DE". A code that isn't in the list counts as not picked. */
  country: string;
  phone?: string;
}

export type AddressField = keyof Address;

/** Error messages by field. An empty or missing entry means the field is fine. */
export type AddressFormErrors = Partial<Record<AddressField, string>>;

export interface AddressFormCountry {
  /** ISO 3166-1 alpha-2 code, e.g. "DE". It is the value stored in `Address.country`. */
  code: string;
  /** Shown in the list, e.g. "Germany". */
  name: string;
}

/** Whether a field is shown, and if it has to be filled. */
export type AddressFormFieldMode = "required" | "optional" | false;

export interface AddressFormProps {
  /** The address. Pass it to control the fields yourself, and update it in `onValueChange`. */
  value?: Address;
  /** Starting values, e.g. a saved address or the country you guessed from the visitor's location. */
  defaultValue?: Partial<Address>;
  /** Called with the whole address on every keystroke. */
  onValueChange?: (address: Address) => void;
  /** Called with a valid address. Return a promise and the button shows "Saving…" until it settles. Return or resolve to a string to show it as an error; if it throws, `labels.failed` is shown. */
  onSubmit?: (address: Address) => void | string | Promise<void | string>;
  /** Countries you ship to. Defaults to most of Europe. Pass one country and the list still shows, already picked. */
  countries?: AddressFormCountry[];
  /** Which optional fields to show. Defaults: email hidden, company and phone optional, region hidden. */
  fields?: { email?: AddressFormFieldMode; company?: AddressFormFieldMode; region?: AddressFormFieldMode; phone?: AddressFormFieldMode };
  /** Your own checks, e.g. a postcode format per country. Runs after the built-in ones, on blur and on submit. */
  validate?: (address: Address) => AddressFormErrors;
  /** Picks the autofill section, so browsers fill the right saved address. Defaults to "shipping". */
  type?: "shipping" | "billing";
  /** Rendered after the fields and before the button, e.g. a "Billing address is the same" checkbox. */
  children?: React.ReactNode;
  className?: string;
  /** Override the built-in English text. */
  labels?: {
    title?: string;
    optional?: string;
    submit?: string;
    submitting?: string;
    saved?: string;
    failed?: string;
    selectCountry?: string;
    phoneHint?: string;
    errorPrefix?: string;
    summary?: (count: number) => string;
    emailInvalid?: string;
    phoneInvalid?: string;
    /** Field labels by field name. */
    fields?: Partial<Record<AddressField, string>>;
    /** "Required" messages by field name. */
    required?: Partial<Record<AddressField, string>>;
  };
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const DEFAULT_COUNTRIES: AddressFormCountry[] = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "HR", name: "Croatia" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "GB", name: "United Kingdom" },
];

const EMPTY: Address = { email: "", firstName: "", lastName: "", company: "", address1: "", address2: "", postcode: "", city: "", region: "", country: "", phone: "" };

interface FieldSpec {
  key: AddressField;
  /** Autofill token after the section, e.g. "given-name". */
  token: string;
  half?: boolean;
  type?: "text" | "email" | "tel";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: string;
}

/** In the order shoppers fill them. Country comes first because it decides what the rest look like. */
const FIELDS: FieldSpec[] = [
  { key: "email", token: "email", type: "email", inputMode: "email", autoCapitalize: "none" },
  { key: "country", token: "country" },
  { key: "firstName", token: "given-name", half: true, autoCapitalize: "words" },
  { key: "lastName", token: "family-name", half: true, autoCapitalize: "words" },
  { key: "company", token: "organization", autoCapitalize: "words" },
  { key: "address1", token: "address-line1", autoCapitalize: "words" },
  { key: "address2", token: "address-line2" },
  { key: "postcode", token: "postal-code", half: true, autoCapitalize: "characters" },
  { key: "city", token: "address-level2", half: true, autoCapitalize: "words" },
  { key: "region", token: "address-level1", autoCapitalize: "words" },
  { key: "phone", token: "tel", type: "tel", inputMode: "tel" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().\/-]{6,20}$/;

/** A shipping (or billing) address form with the right autofill hints, a country list, inline errors on blur and an error summary on submit. */
export function AddressForm({
  value,
  defaultValue,
  onValueChange,
  onSubmit,
  countries = DEFAULT_COUNTRIES,
  fields,
  validate,
  type = "shipping",
  children,
  className,
  labels,
}: AddressFormProps) {
  const text = {
    title: type === "billing" ? "Billing address" : "Shipping address",
    optional: "(optional)",
    submit: "Continue",
    submitting: "Saving…",
    saved: "Address saved",
    failed: "We couldn't save your address. Try again.",
    selectCountry: "Select a country",
    phoneHint: "In case the courier needs to reach you.",
    errorPrefix: "Error:",
    summary: (count: number) => (count === 1 ? "1 field needs your attention" : `${count} fields need your attention`),
    emailInvalid: "Enter an email address like name@example.com",
    phoneInvalid: "Enter a phone number using digits, spaces and +",
    ...labels,
    fields: {
      email: "Email",
      firstName: "First name",
      lastName: "Last name",
      company: "Company",
      address1: "Street and house number",
      address2: "Apartment, suite, floor",
      postcode: "Postcode",
      city: "City",
      region: "State or region",
      country: "Country",
      phone: "Phone",
      ...labels?.fields,
    },
    required: {
      email: "Enter your email address",
      firstName: "Enter your first name",
      lastName: "Enter your last name",
      company: "Enter your company name",
      address1: "Enter your street and house number",
      address2: "Enter your apartment, suite or floor",
      postcode: "Enter your postcode",
      city: "Enter your city",
      region: "Enter your state or region",
      country: "Select your country",
      phone: "Enter your phone number",
      ...labels?.required,
    },
  };

  const modes: Record<AddressField, AddressFormFieldMode> = {
    email: false,
    company: "optional",
    region: false,
    phone: "optional",
    ...fields,
    firstName: "required",
    lastName: "required",
    address1: "required",
    address2: "optional",
    postcode: "required",
    city: "required",
    country: "required",
  };
  const shown = FIELDS.filter((field) => modes[field.key]);

  const [state, setState] = React.useState<Address>(() => ({
    ...EMPTY,
    country: countries.length === 1 ? countries[0].code : "",
    ...defaultValue,
  }));
  const address = value ?? state;
  const [errors, setErrors] = React.useState<AddressFormErrors>({});
  const [dirty, setDirty] = React.useState<Partial<Record<AddressField, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [summaryFocus, setSummaryFocus] = React.useState(0);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const fieldId = (key: AddressField) => `${id}-${key}`;

  React.useEffect(() => {
    if (summaryFocus) summaryRef.current?.focus();
  }, [summaryFocus]);

  /** The message for one field, or "" when it is fine. */
  const check = (key: AddressField, next: Address): string => {
    const mode = modes[key];
    if (!mode) return "";
    const raw = key === "country" && !countries.some((country) => country.code === next.country) ? "" : (next[key] ?? "").trim();
    if (!raw) return mode === "required" ? text.required[key] : "";
    if (key === "email" && !EMAIL.test(raw)) return text.emailInvalid;
    if (key === "phone" && !PHONE.test(raw)) return text.phoneInvalid;
    return validate?.(next)[key] ?? "";
  };

  const setField = (key: AddressField, fieldValue: string) => {
    const next = { ...address, [key]: fieldValue };
    if (value === undefined) setState(next);
    onValueChange?.(next);
    setDirty((current) => (current[key] ? current : { ...current, [key]: true }));
    setSaved(false);
    // Once a field shows an error, it updates as the shopper types, so it clears the moment it is fixed.
    if (errors[key]) setErrors((current) => ({ ...current, [key]: check(key, next) }));
  };

  const onBlur = (key: AddressField) => {
    // Don't scold someone for tabbing through: only check fields they typed in, or every field after a submit.
    if (!dirty[key] && !submitted) return;
    setErrors((current) => ({ ...current, [key]: check(key, address) }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setFormError("");
    setSaved(false);
    setSubmitted(true);
    const found: AddressFormErrors = {};
    for (const field of shown) {
      const message = check(field.key, address);
      if (message) found[field.key] = message;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSummaryFocus((n) => n + 1);
      return;
    }
    const clean = Object.fromEntries(Object.entries(address).map(([key, item]) => [key, typeof item === "string" ? item.trim() : item])) as unknown as Address;
    setBusy(true);
    try {
      const result = await onSubmit?.(clean);
      if (typeof result === "string" && result) setFormError(result);
      else setSaved(true);
    } catch {
      setFormError(text.failed);
    }
    setBusy(false);
  };

  const listed = shown.filter((field) => errors[field.key]);

  const jumpTo = (event: React.MouseEvent<HTMLAnchorElement>, key: AddressField) => {
    event.preventDefault();
    const element = document.getElementById(fieldId(key));
    element?.scrollIntoView({ block: "center" });
    element?.focus({ preventScroll: true });
  };

  const control = (invalid: boolean) =>
    cx("h-11 w-full rounded-md border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground md:text-sm", invalid ? "border-destructive" : "border-border", ring);

  return (
    <form noValidate onSubmit={handleSubmit} className={cx("text-foreground", className)}>
      <fieldset className="min-w-0">
        <legend className="mb-5 text-base font-semibold">{text.title}</legend>

        {submitted && listed.length > 0 && (
          <div ref={summaryRef} tabIndex={-1} aria-labelledby={`${id}-summary`} className="mb-6 rounded-md border-2 border-destructive p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p id={`${id}-summary`} className="text-sm font-semibold">
              {text.summary(listed.length)}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {listed.map((field) => (
                <li key={field.key}>
                  <a href={`#${fieldId(field.key)}`} onClick={(event) => jumpTo(event, field.key)} className={cx("inline-flex min-h-8 items-center rounded-sm text-sm text-destructive underline underline-offset-4 hover:no-underline", ring)}>
                    {errors[field.key]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          {shown.map((field, i) => {
            const key = field.key;
            const inputId = fieldId(key);
            const error = errors[key];
            const required = modes[key] === "required";
            const hint = key === "phone" ? text.phoneHint : "";
            const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(" ") || undefined;
            const last = i === shown.length - 1;
            return (
              <div key={key} className={cx("flex min-w-0 flex-col gap-1.5", !field.half && "sm:col-span-2")}>
                <label htmlFor={inputId} className="text-sm font-medium">
                  {text.fields[key]}
                  {!required && <span className="font-normal text-muted-foreground"> {text.optional}</span>}
                </label>
                {hint && (
                  <p id={`${inputId}-hint`} className="-mt-1 text-sm text-muted-foreground">
                    {hint}
                  </p>
                )}
                {key === "country" ? (
                  <div className="relative">
                    <select
                      id={inputId}
                      name={key}
                      value={countries.some((country) => country.code === address.country) ? address.country : ""}
                      onChange={(event) => setField(key, event.target.value)}
                      onBlur={() => onBlur(key)}
                      autoComplete={`${type} country`}
                      required
                      aria-invalid={error ? true : undefined}
                      aria-describedby={describedBy}
                      className={cx(control(Boolean(error)), "appearance-none pr-10")}
                    >
                      <option value="" disabled>
                        {text.selectCountry}
                      </option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                ) : (
                  <input
                    id={inputId}
                    name={key}
                    type={field.type ?? "text"}
                    inputMode={field.inputMode}
                    autoComplete={`${type} ${field.token}`}
                    autoCapitalize={field.autoCapitalize}
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint={last ? "done" : "next"}
                    value={address[key] ?? ""}
                    onChange={(event) => setField(key, event.target.value)}
                    onBlur={() => onBlur(key)}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={control(Boolean(error))}
                  />
                )}
                {error && (
                  <p id={`${inputId}-error`} className="flex items-start gap-1.5 text-sm text-destructive">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7.5v5M12 16.2v.3" />
                    </svg>
                    <span>
                      <span className="sr-only">{text.errorPrefix} </span>
                      {error}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {children && <div className="mt-6">{children}</div>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          aria-busy={busy || undefined}
          className={cx(
            "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors duration-150 motion-reduce:transition-none sm:w-auto",
            ring,
            busy ? "cursor-progress" : "hover:bg-primary/90",
          )}
        >
          {busy && (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 animate-spin motion-reduce:animate-none">
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
          )}
          {busy ? text.submitting : text.submit}
        </button>
        <p role="status" aria-live="polite" className={cx("text-sm", formError ? "text-destructive" : "text-emerald-700")}>
          {formError || (saved ? text.saved : "")}
        </p>
      </div>
    </form>
  );
}
