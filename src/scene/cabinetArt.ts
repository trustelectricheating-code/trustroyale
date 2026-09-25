export const CABINET_DESIGN = { width: 720, height: 1080 } as const;

// Measured from the 1024 x 1536 generated source, then scaled to design space.
export const CABINET_ART = {
  source: { width: 1024, height: 1536 },
  reelWindow: { x: 143, y: 312, width: 434, height: 242 },
  spinButton: { x: 284, y: 628, width: 152, height: 82 },
  leftReadout: { x: 205, y: 660 },
  rightReadout: { x: 515, y: 660 },
} as const;
