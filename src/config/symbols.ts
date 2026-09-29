export const SYMBOL_IDS = [
  "scott", "fiona", "gia", "keith", "neos", "cherry", "seven", "sweets",
] as const;

export type SymbolId = (typeof SYMBOL_IDS)[number];
export type SymbolKind = "face" | "emblem" | "filler";

export interface SymbolFrames {
  idle: string;
  half?: string;
  closed?: string;
  win?: string;
  pulse?: string;
  shine?: string;
}

export interface SymbolConfig {
  id: SymbolId;
  name: string;
  kind: SymbolKind;
  frames: SymbolFrames;
}

export const SYMBOLS = {
  scott: { id: "scott", name: "Scott", kind: "face", frames: { idle: "face.scott.idle", half: "face.scott.half", closed: "face.scott.closed", win: "face.scott.win" } },
  fiona: { id: "fiona", name: "Fiona", kind: "face", frames: { idle: "face.fiona.idle", half: "face.fiona.half", closed: "face.fiona.closed", win: "face.fiona.win" } },
  gia: { id: "gia", name: "Gia", kind: "face", frames: { idle: "face.gia.idle", half: "face.gia.half", closed: "face.gia.closed", win: "face.gia.win" } },
  keith: { id: "keith", name: "Keith", kind: "face", frames: { idle: "face.keith.idle", half: "face.keith.half", closed: "face.keith.closed", win: "face.keith.win" } },
  neos: { id: "neos", name: "Neos", kind: "emblem", frames: { idle: "sym.neos.chip", pulse: "emblem.neos.pulse" } },
  cherry: { id: "cherry", name: "Cherry", kind: "filler", frames: { idle: "sym.cherry", shine: "sym.cherry.shine" } },
  seven: { id: "seven", name: "Seven", kind: "filler", frames: { idle: "sym.seven", shine: "sym.seven.shine" } },
  sweets: { id: "sweets", name: "Sweets", kind: "filler", frames: { idle: "sym.sweets", shine: "sym.sweets.shine" } },
} as const satisfies Record<SymbolId, SymbolConfig>;
