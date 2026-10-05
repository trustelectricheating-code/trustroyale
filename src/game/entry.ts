// Player details handed over in the URL fragment by the landing page: #entry=<base64url(JSON)>.
import { validateLead, type LeadField, type LeadInput } from "./leadValidation";

export type EntryDetails = Partial<LeadInput>;
export const ENTRY_KEY = "royale-entry";
const FIELDS: LeadField[] = ["firstName", "lastName", "phone", "email", "region"];

function decodeBase64Url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const standard = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4));
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return null;
  }
}

/** Decodes the fragment, drops fields that fail claim validation, and returns null when nothing valid remains. */
export function parseEntryFragment(hash: string): EntryDetails | null {
  const match = /^#?(?:.*&)?entry=([^&]*)/.exec(hash);
  if (!match) return null;
  const json = decodeBase64Url(match[1]);
  if (json === null) return null;
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return null; }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const checked = validateLead(source);
  const invalid = checked.ok ? {} : checked.fields;
  const details: EntryDetails = {};
  for (const name of FIELDS) {
    const value = source[name];
    if (typeof value === "string" && !(name in invalid) && value.trim() !== "") details[name] = value.trim();
  }
  return Object.keys(details).length > 0 ? details : null;
}

/** Keeps the details for this tab, then removes the fragment from the address bar. */
export function takeEntryFromLocation(): void {
  const details = parseEntryFragment(location.hash);
  if (!/(^#|&)entry=/.test(location.hash)) return;
  try {
    if (details) sessionStorage.setItem(ENTRY_KEY, JSON.stringify(details));
  } catch {
    // Storage can be blocked; the claim form simply starts empty.
  }
  history.replaceState(null, "", location.pathname + location.search);
}

export function readEntry(): EntryDetails | null {
  try {
    const stored = sessionStorage.getItem(ENTRY_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const details: EntryDetails = {};
    for (const name of FIELDS) if (typeof parsed[name] === "string") details[name] = parsed[name] as string;
    return Object.keys(details).length > 0 ? details : null;
  } catch {
    return null;
  }
}

export function clearEntry(): void {
  try { sessionStorage.removeItem(ENTRY_KEY); } catch { /* nothing to clear */ }
}
