export const CABINET_DESIGN = { width: 720, height: 1080 } as const;
export type TitlePlacement = "topper" | "belly";
export const DEFAULT_TITLE_PLACEMENT: TitlePlacement = "belly";

// Measured from the 1024 x 1536 generated source, then scaled to design space.
export const CABINET_ART = {
  source: { width: 1024, height: 1536 },
  titlePlacements: {
    topper: { x: 160, y: 122, width: 400, height: 110 },
    belly: { x: 90, y: 780, width: 540, height: 120 },
  },
  marqueeBulbs: [
    [124, 200], [141, 161], [174, 129], [209, 102], [250, 84], [294, 71],
    [426, 71], [470, 84], [513, 102], [547, 129], [579, 161], [597, 200],
    [157, 213], [174, 181], [200, 151], [233, 129], [271, 115], [310, 105],
    [409, 105], [449, 115], [487, 129], [520, 151], [546, 181], [563, 213],
  ] as const,
  reelWindow: { x: 143, y: 312, width: 434, height: 242 },
  // Owner round 1: one wide control replaces the two stale readouts and small centre button.
  spinButtonOpening: { x: 205, y: 616, width: 310, height: 72 },
} as const;
