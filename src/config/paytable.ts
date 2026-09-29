import type { SymbolId } from "./symbols.js";

export type Discount = 10 | 15 | 20;
export type Celebration = "blink" | "pulse" | "glow";
export type PrizeSymbol = SymbolId;
export type PaytablePattern =
  | { counts: Partial<Record<SymbolId, number>>; anyOther?: number }
  | { faceCounts: readonly [2, 1] };

export interface PaytableRule {
  id: string;
  label: string;
  pattern: PaytablePattern;
  discount: Discount;
  celebration: Celebration;
  /** Gate B carousel fields retained until gameplay UI replaces that scene. */
  prize: Discount;
  shortLabel: string;
  fullLabel: string;
  ariaLabel: string;
  symbols: readonly PrizeSymbol[];
  examples?: readonly (readonly PrizeSymbol[])[];
}

export type PrizeRule = PaytableRule;

export const PRIZE_SYMBOLS: Record<PrizeSymbol, { label: string; src: string }> = {
  scott: { label: "Scott", src: "/assets/mock/scott-medallion.webp" },
  fiona: { label: "Fiona", src: "/assets/mock/fiona-medallion.webp" },
  gia: { label: "Gia", src: "/assets/mock/gia-medallion.webp" },
  keith: { label: "Keith", src: "/assets/mock/keith-medallion.webp" },
  neos: { label: "Neos", src: "/assets/mock/neos-medallion.webp" },
  cherry: { label: "Cherry", src: "/assets/mock/cherry-reel.webp" },
  seven: { label: "Seven", src: "/assets/mock/seven-reel.webp" },
  sweets: { label: "Sweets", src: "/assets/symbols/sweets.webp" },
};

export const PAYTABLE: readonly PaytableRule[] = [
  {
    id: "scott-3", label: "3 × Scott", pattern: { counts: { scott: 3 } }, discount: 20, celebration: "blink",
    prize: 20, shortLabel: "3 × Scott", fullLabel: "3 × Scott", ariaLabel: "Scott times three, 20 percent", symbols: ["scott", "scott", "scott"],
  },
  {
    id: "fiona-3", label: "3 × Fiona", pattern: { counts: { fiona: 3 } }, discount: 20, celebration: "blink",
    prize: 20, shortLabel: "3 × Fiona", fullLabel: "3 × Fiona", ariaLabel: "Fiona times three, 20 percent", symbols: ["fiona", "fiona", "fiona"],
  },
  {
    id: "gia-3", label: "3 × Gia", pattern: { counts: { gia: 3 } }, discount: 20, celebration: "blink",
    prize: 20, shortLabel: "3 × Gia", fullLabel: "3 × Gia", ariaLabel: "Gia times three, 20 percent", symbols: ["gia", "gia", "gia"],
  },
  {
    id: "keith-3", label: "3 × Keith", pattern: { counts: { keith: 3 } }, discount: 15, celebration: "blink",
    prize: 15, shortLabel: "3 × Keith", fullLabel: "3 × Keith", ariaLabel: "Keith times three, 15 percent", symbols: ["keith", "keith", "keith"],
  },
  {
    id: "keith-2-any", label: "2 × Keith + any other symbol", pattern: { counts: { keith: 2 }, anyOther: 1 }, discount: 15, celebration: "glow",
    prize: 15, shortLabel: "2 × Keith + any", fullLabel: "2 × Keith + any other symbol", ariaLabel: "Keith times two plus any, 15 percent", symbols: ["keith", "keith", "cherry"],
    examples: [["keith", "keith", "cherry"], ["keith", "keith", "seven"], ["keith", "keith", "scott"], ["keith", "keith", "neos"]],
  },
  {
    id: "people-2-plus-1", label: "Two of one face + one different face", pattern: { faceCounts: [2, 1] }, discount: 15, celebration: "glow",
    prize: 15, shortLabel: "Any 2 + 1 face", fullLabel: "Any 2 same + 1 other face (Scott, Fiona, Gia, Keith)", ariaLabel: "Two of Scott, Fiona, Gia, or Keith plus one different person, 15 percent", symbols: ["scott", "scott", "fiona"],
    examples: [["scott", "scott", "fiona"], ["gia", "gia", "keith"], ["fiona", "fiona", "scott"], ["keith", "keith", "gia"]],
  },
  {
    id: "neos-3", label: "3 × Neos", pattern: { counts: { neos: 3 } }, discount: 10, celebration: "pulse",
    prize: 10, shortLabel: "3 × Neos", fullLabel: "3 × Neos", ariaLabel: "Neos times three, 10 percent", symbols: ["neos", "neos", "neos"],
  },
] as const;

/** Preserve approved Gate B presentation order independently from evaluator precedence. */
export const PRIZE_CAROUSEL_RULES: readonly PaytableRule[] = [
  PAYTABLE[0], PAYTABLE[1], PAYTABLE[2], PAYTABLE[3], PAYTABLE[5], PAYTABLE[4], PAYTABLE[6],
];
