export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneLayout {
  orientation: "portrait" | "landscape";
  viewport: LayoutRect;
  safeBounds: LayoutRect;
  background: LayoutRect & { scale: number };
  marquee: LayoutRect & { scale: number };
  paytable: LayoutRect & { scale: number };
  machine: LayoutRect & { scale: number };
  spinButton: LayoutRect & { scale: number };
  chipTray: LayoutRect & { scale: number };
}

const PORTRAIT_GRID = { width: 1080, height: 1920 } as const;
const LANDSCAPE_GRID = { width: 1920, height: 1080 } as const;
const MACHINE_ASPECT = 720 / 1040;

function rect(x: number, y: number, width: number, height: number): LayoutRect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

function withScale(frame: LayoutRect, designWidth: number, designHeight: number) {
  return { ...frame, scale: Math.min(frame.width / designWidth, frame.height / designHeight) };
}

function centredRect(bounds: LayoutRect, width: number, height: number, y: number): LayoutRect {
  return rect(bounds.x + (bounds.width - width) / 2, y, width, height);
}

export function computeLayout(width: number, height: number, safeAreaInsets: SafeAreaInsets): SceneLayout {
  const viewportWidth = Math.max(1, width);
  const viewportHeight = Math.max(1, height);
  const safe = {
    top: Math.max(0, safeAreaInsets.top),
    right: Math.max(0, safeAreaInsets.right),
    bottom: Math.max(0, safeAreaInsets.bottom),
    left: Math.max(0, safeAreaInsets.left),
  };
  const safeBounds = rect(
    safe.left,
    safe.top,
    viewportWidth - safe.left - safe.right,
    viewportHeight - safe.top - safe.bottom,
  );
  const orientation = safeBounds.height >= safeBounds.width ? "portrait" : "landscape";
  const grid = orientation === "portrait" ? PORTRAIT_GRID : LANDSCAPE_GRID;
  const backgroundScale = Math.max(viewportWidth / grid.width, viewportHeight / grid.height);
  const backgroundWidth = grid.width * backgroundScale;
  const backgroundHeight = grid.height * backgroundScale;
  const background = {
    ...rect((viewportWidth - backgroundWidth) / 2, (viewportHeight - backgroundHeight) / 2, backgroundWidth, backgroundHeight),
    scale: backgroundScale,
  };

  if (orientation === "portrait") {
    const gap = Math.max(3, Math.min(14, safeBounds.height * 0.008));
    const horizontalPadding = Math.max(7, Math.min(34, safeBounds.width * 0.035));
    const content = rect(
      safeBounds.x + horizontalPadding,
      safeBounds.y + gap,
      safeBounds.width - horizontalPadding * 2,
      safeBounds.height - gap * 2,
    );
    const marqueeHeight = content.height * 0.11;
    const paytableHeight = content.height * 0.115;
    const chipHeight = content.height * 0.075;
    const machineSlotHeight = content.height - marqueeHeight - paytableHeight - chipHeight - gap * 3;
    const machineHeight = Math.min(machineSlotHeight, content.width / MACHINE_ASPECT);
    const machineWidth = machineHeight * MACHINE_ASPECT;

    let y = content.y;
    const marquee = withScale(rect(content.x, y, content.width, marqueeHeight), 960, 190);
    y += marqueeHeight + gap;
    const paytable = withScale(rect(content.x, y, content.width, paytableHeight), 960, 150);
    y += paytableHeight + gap;
    const machine = withScale(centredRect(content, machineWidth, machineHeight, y), 720, 1040);
    const spinHeight = machine.height * 0.1;
    const spinWidth = machine.width * 0.34;
    const spinButton = withScale(rect(machine.x + (machine.width - spinWidth) / 2, machine.y + machine.height * 0.8, spinWidth, spinHeight), 430, 150);
    y += machineHeight + gap;
    const chipTray = withScale(rect(content.x, y, content.width, Math.max(0, content.y + content.height - y)), 520, 130);

    return { orientation, viewport: rect(0, 0, viewportWidth, viewportHeight), safeBounds, background, marquee, paytable, machine, spinButton, chipTray };
  }

  const padding = Math.max(6, Math.min(30, safeBounds.height * 0.025));
  const gap = Math.max(5, Math.min(24, safeBounds.width * 0.012));
  const content = rect(
    safeBounds.x + padding,
    safeBounds.y + padding,
    safeBounds.width - padding * 2,
    safeBounds.height - padding * 2,
  );
  const machineHeight = content.height * 0.82;
  const machineWidth = machineHeight * MACHINE_ASPECT;
  const centreX = content.x + content.width / 2;
  const marqueeHeight = content.height * 0.145;
  const marqueeWidth = machineWidth * 1.08;
  const machine = withScale(rect(centreX - machineWidth / 2, content.y + marqueeHeight * 0.5, machineWidth, machineHeight), 720, 1040);
  const marquee = withScale(rect(centreX - marqueeWidth / 2, content.y, marqueeWidth, marqueeHeight), 960, 190);
  const spinHeight = machine.height * 0.1;
  const spinWidth = machineWidth * 0.34;
  const spinButton = withScale(rect(centreX - spinWidth / 2, machine.y + machine.height * 0.8, spinWidth, spinHeight), 430, 150);
  const sideWidth = Math.max(0, (content.width - marqueeWidth) / 2 - gap);
  const paytableWidth = Math.min(sideWidth, Math.max(content.height * 0.48, 150));
  const paytableHeight = Math.min(content.height * 0.78, paytableWidth * 1.35);
  const paytable = withScale(rect(content.x, content.y + (content.height - paytableHeight) / 2, paytableWidth, paytableHeight), 390, 620);
  const chipTray = withScale(rect(content.x + content.width - paytableWidth, content.y + (content.height - paytableHeight) / 2, paytableWidth, paytableHeight), 390, 620);

  return { orientation, viewport: rect(0, 0, viewportWidth, viewportHeight), safeBounds, background, marquee, paytable, machine, spinButton, chipTray };
}
