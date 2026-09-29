export type PrizeSymbol = "scott" | "fiona" | "gia" | "keith" | "neos" | "any" | "question";

export const PRIZE_SYMBOLS: Record<PrizeSymbol, { label: string; src?: string; text?: string }> = {
  scott: { label: "Scott", src: "/assets/mock/scott-medallion.webp" },
  fiona: { label: "Fiona", src: "/assets/mock/fiona-medallion.webp" },
  gia: { label: "Gia", src: "/assets/mock/gia-medallion.webp" },
  keith: { label: "Keith", src: "/assets/mock/keith-medallion.webp" },
  neos: { label: "Neos", src: "/assets/emblem/neos.svg" },
  any: { label: "Any symbol", text: "ANY" },
  question: { label: "Other face", text: "?" },
};

export interface PrizeRule {
  id: string;
  prize: number;
  shortLabel: string;
  fullLabel: string;
  ariaLabel: string;
  symbols: PrizeSymbol[];
  examples?: PrizeSymbol[][];
}

export const PAYTABLE: readonly PrizeRule[] = [
  { id: "scott-3", prize: 20, shortLabel: "3 × Scott", fullLabel: "3 × Scott", ariaLabel: "Scott times three, 20 percent", symbols: ["scott", "scott", "scott"] },
  { id: "fiona-3", prize: 20, shortLabel: "3 × Fiona", fullLabel: "3 × Fiona", ariaLabel: "Fiona times three, 20 percent", symbols: ["fiona", "fiona", "fiona"] },
  { id: "gia-3", prize: 20, shortLabel: "3 × Gia", fullLabel: "3 × Gia", ariaLabel: "Gia times three, 20 percent", symbols: ["gia", "gia", "gia"] },
  { id: "keith-3", prize: 15, shortLabel: "3 × Keith", fullLabel: "3 × Keith", ariaLabel: "Keith times three, 15 percent", symbols: ["keith", "keith", "keith"] },
  {
    id: "faces-2-plus-1",
    prize: 15,
    shortLabel: "Any 2 + 1 face",
    fullLabel: "Any 2 same + 1 other face (Scott, Fiona, Gia, Keith)",
    ariaLabel: "Two of Scott, Fiona, Gia, or Keith plus one different person, 15 percent",
    symbols: ["scott", "scott", "question"],
    examples: [
      ["scott", "scott", "question"],
      ["fiona", "fiona", "question"],
      ["gia", "gia", "question"],
      ["keith", "keith", "question"],
    ],
  },
  { id: "keith-2-any", prize: 15, shortLabel: "2 × Keith + any", fullLabel: "2 × Keith + any other symbol", ariaLabel: "Keith times two plus any, 15 percent", symbols: ["keith", "keith", "any"] },
  { id: "neos-3", prize: 10, shortLabel: "3 × Neos", fullLabel: "3 × Neos", ariaLabel: "Neos times three, 10 percent", symbols: ["neos", "neos", "neos"] },
] as const;
