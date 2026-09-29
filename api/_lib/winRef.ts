import { randomInt } from "node:crypto";

export const WIN_REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newWinRef(): string {
  return `TR-${Array.from({ length: 6 }, () => WIN_REF_ALPHABET[randomInt(WIN_REF_ALPHABET.length)]).join("")}`;
}
