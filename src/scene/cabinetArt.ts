export const CABINET_DESIGN = { width: 720, height: 1080 } as const;

// Measured from the 1024 x 1536 generated source, then scaled to design space.
export const CABINET_ART = {
  source: { width: 1024, height: 1536 },
  marqueeFrame: { x: 130, y: 70, width: 460, height: 132 },
  marqueePlate: { x: 154, y: 84, width: 412, height: 102 },
  marqueeBulbs: [
    [124, 200], [141, 161], [174, 129], [209, 102], [250, 84], [294, 71],
    [426, 71], [470, 84], [513, 102], [547, 129], [579, 161], [597, 200],
    [157, 213], [174, 181], [200, 151], [233, 129], [271, 115], [310, 105],
    [409, 105], [449, 115], [487, 129], [520, 151], [546, 181], [563, 213],
  ] as const,
  reelWindow: { x: 143, y: 312, width: 434, height: 242 },
  // Measured black opening in source pixels: (451, 876) through (576, 978).
  spinButtonOpening: { x: 317, y: 616, width: 88, height: 72 },
  leftReadout: { x: 205, y: 660 },
  rightReadout: { x: 515, y: 660 },
} as const;
