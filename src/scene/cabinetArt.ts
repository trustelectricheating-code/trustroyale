export const CABINET_DESIGN = { width: 720, height: 1080 } as const;
export type TitlePlacement = "topper" | "belly";
export const DEFAULT_TITLE_PLACEMENT: TitlePlacement = "belly";

// Measured from the 1024 x 1536 generated source, then scaled to design space.
export const CABINET_ART = {
  source: { width: 1024, height: 1536 },
  titlePlacements: {
    topper: { x: 150, y: 120, width: 420, height: 112 },
    belly: { x: 90, y: 745, width: 540, height: 145 },
  },
  marqueeBulbs: [
    [143, 135], [175, 181], [203, 91], [246, 132], [294, 70], [361, 101],
    [428, 71], [473, 106], [518, 91], [545, 146], [577, 134], [604, 181],
  ] as const,
  reelWindow: { x: 153, y: 308, width: 414, height: 205 },
  // Owner round 1: one wide control replaces the two stale readouts and small centre button.
  spinButtonOpening: { x: 271, y: 563, width: 178, height: 121 },
} as const;
