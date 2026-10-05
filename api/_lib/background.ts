import { waitUntil } from "@vercel/functions";

/** Runs work after the response is sent. Never throws and never rejects. */
export function background(work: Promise<unknown>): void {
  const safe = work.catch(() => undefined);
  try {
    waitUntil(safe);
  } catch {
    // Not on Vercel (local dev): the promise still runs.
  }
}
