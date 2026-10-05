// Lead claim rules, shared by the browser (inline errors) and /api/lead (source of truth).
export const CONSENT_TEXT = "By claiming, you agree that Trust Electric Heating can contact you about your offer.";

export interface LeadInput { firstName: string; lastName: string; phone: string; email: string; region: string }
export type LeadField = keyof LeadInput;
export type LeadFieldErrors = Partial<Record<LeadField, string>>;
export type LeadValidation = { ok: true; value: LeadInput } | { ok: false; fields: LeadFieldErrors };

/** The SharpSpring field 296 list, in display order (source of truth: LEAD_REGIONS in trust-lp). */
export const REGIONS = [
  "North East", "North West", "Yorkshire and the Humber", "East Midlands", "West Midlands", "East of England",
  "London", "South East", "South West", "Wales", "Scotland",
] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SS_TRACKING_ID = /^[0-9A-Za-z][0-9A-Za-z_|.-]{0,63}$/;

export function isValidSsTrackingId(value: unknown): value is string {
  return typeof value === "string" && SS_TRACKING_ID.test(value);
}

/** Returns the national form (07911123456), or null when the number is not a UK number. */
export function normalisePhone(raw: string): string | null {
  let value = raw.replace(/\(0\)/g, "").replace(/[\s\-.()]/g, "");
  if (value.startsWith("+44")) value = `0${value.slice(3)}`;
  else if (value.startsWith("0044")) value = `0${value.slice(4)}`;
  return /^0[1-9]\d{8,9}$/.test(value) ? value : null;
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function validateLead(input: Partial<Record<LeadField, unknown>> | null | undefined): LeadValidation {
  const source = input ?? {};
  const fields: LeadFieldErrors = {};
  const firstName = text(source.firstName);
  const lastName = text(source.lastName);
  const email = text(source.email);
  const phone = normalisePhone(text(source.phone));
  const region = text(source.region);

  if (firstName.length < 1 || firstName.length > 80) fields.firstName = "Please enter your first name.";
  if (lastName.length < 1 || lastName.length > 80) fields.lastName = "Please enter your last name.";
  if (!phone) fields.phone = "Please enter a UK phone number, for example 07911 123456.";
  if (!(REGIONS as readonly string[]).includes(region)) fields.region = "Please choose your region.";
  if (!EMAIL.test(email) || email.length > 254) fields.email = "Please enter a valid email address.";
  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, value: { firstName, lastName, phone: phone!, email, region } };
}
