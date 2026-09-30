import { CABINET_ART, CABINET_DESIGN, DEFAULT_TITLE_PLACEMENT, type TitlePlacement } from "./cabinetArt";

export interface SafeAreaInsets { top: number; right: number; bottom: number; left: number }
export interface LayoutRect { x: number; y: number; width: number; height: number }

export interface SceneLayout {
  orientation: "portrait" | "landscape";
  viewport: LayoutRect;
  safeBounds: LayoutRect;
  background: LayoutRect & { scale: number };
  marquee: LayoutRect & { scale: number };
  paytable: LayoutRect & { scale: number; iconSize: number; prizeSize: number };
  machine: LayoutRect & { scale: number };
  spinButton: LayoutRect & { scale: number };
  chipTray: LayoutRect & { scale: number };
}

const MACHINE_ASPECT = CABINET_DESIGN.width / CABINET_DESIGN.height;

function rect(x: number, y: number, width: number, height: number): LayoutRect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

function scaled(frame: LayoutRect, designWidth: number, designHeight: number) {
  return { ...frame, scale: Math.min(frame.width / designWidth, frame.height / designHeight) };
}

function overlays(machine: SceneLayout["machine"], titlePlacement: TitlePlacement): Pick<SceneLayout, "marquee" | "spinButton"> {
  const scale = machine.scale;
  const marqueeArt = CABINET_ART.titlePlacements[titlePlacement];
  const marquee = scaled(rect(
    machine.x + marqueeArt.x * scale,
    machine.y + marqueeArt.y * scale,
    marqueeArt.width * scale,
    marqueeArt.height * scale,
  ), 800, 170);
  const opening = CABINET_ART.spinButtonOpening;
  const inset = 4;
  const button = {
    x: opening.x + inset,
    y: opening.y + inset,
    width: opening.width - inset * 2,
    height: opening.height - inset * 2,
  };
  const spinButton = scaled(rect(
    machine.x + button.x * scale,
    machine.y + button.y * scale,
    button.width * scale,
    button.height * scale,
  ), button.width, button.height);
  return { marquee, spinButton };
}

export function computeLayout(width: number, height: number, safeAreaInsets: SafeAreaInsets, titlePlacement: TitlePlacement = DEFAULT_TITLE_PLACEMENT): SceneLayout {
  const viewport = rect(0, 0, Math.max(1, width), Math.max(1, height));
  const safeBounds = rect(
    Math.max(0, safeAreaInsets.left),
    Math.max(0, safeAreaInsets.top),
    viewport.width - Math.max(0, safeAreaInsets.left) - Math.max(0, safeAreaInsets.right),
    viewport.height - Math.max(0, safeAreaInsets.top) - Math.max(0, safeAreaInsets.bottom),
  );
  const orientation = safeBounds.height >= safeBounds.width ? "portrait" : "landscape";
  const background = { ...viewport, scale: 1 };
  const padding = Math.max(5, Math.min(28, Math.min(safeBounds.width, safeBounds.height) * 0.025));
  const content = rect(safeBounds.x + padding, safeBounds.y + padding, safeBounds.width - padding * 2, safeBounds.height - padding * 2);
  const phone = Math.min(safeBounds.width, safeBounds.height) < 600;

  if (orientation === "portrait") {
    const gap = Math.max(5, Math.min(14, content.height * 0.012));
    const paytableHeight = Math.max(68, Math.min(104, safeBounds.height * 0.12));
    const availableHeight = content.height - paytableHeight - gap;
    const machineHeight = Math.min(availableHeight, content.width / MACHINE_ASPECT);
    const machineWidth = machineHeight * MACHINE_ASPECT;
    const machineY = content.y + paytableHeight + gap + (availableHeight - machineHeight) * 0.48;
    const machine = scaled(rect(content.x + (content.width - machineWidth) / 2, machineY, machineWidth, machineHeight), CABINET_DESIGN.width, CABINET_DESIGN.height);
    const paytableFrame = scaled(rect(content.x, content.y, content.width, paytableHeight), 960, 150);
    const paytable = {
      ...paytableFrame,
      iconSize: Math.max(36, Math.min(50, paytableHeight * 0.27, content.width * 0.13)),
      prizeSize: Math.max(27, Math.min(42, paytableHeight * 0.22, content.width * 0.12)),
    };
    const wheelSize = Math.min(content.width * 0.48, machine.height * 0.27);
    const chipTray = scaled(rect(content.x + content.width - wheelSize, machine.y + machine.height * 0.1, wheelSize, wheelSize), 560, 560);
    return { orientation, viewport, safeBounds, background, paytable, machine, chipTray, ...overlays(machine, titlePlacement) };
  }

  if (phone) {
    const gap = 8;
    const trackerHeight = 72;
    const machineHeight = content.height - trackerHeight - gap;
    const machineWidth = machineHeight * MACHINE_ASPECT;
    const machine = scaled(rect(content.x + (content.width - machineWidth) / 2, content.y + trackerHeight + gap, machineWidth, machineHeight), CABINET_DESIGN.width, CABINET_DESIGN.height);
    const trackerWidth = Math.min(content.width, Math.max(320, machineWidth * 1.8));
    const paytableFrame = scaled(rect(content.x + (content.width - trackerWidth) / 2, content.y, trackerWidth, trackerHeight), 960, 150);
    const paytable = { ...paytableFrame, iconSize: 44, prizeSize: 32 };
    const chipTray = scaled(paytableFrame, 960, 150);
    return { orientation, viewport, safeBounds, background, paytable, machine, chipTray, ...overlays(machine, titlePlacement) };
  }

  const machineHeight = content.height;
  const machineWidth = machineHeight * MACHINE_ASPECT;
  const machine = scaled(rect(content.x + (content.width - machineWidth) / 2, content.y, machineWidth, machineHeight), CABINET_DESIGN.width, CABINET_DESIGN.height);
  const sideGap = Math.max(8, Math.min(28, content.width * 0.014));
  const sideWidth = Math.max(0, (content.width - machineWidth) / 2 - sideGap * 2);
  const panelWidth = Math.min(sideWidth * 0.72, content.height * 0.42);
  const panelHeight = Math.min(150, Math.max(92, content.height * 0.16));
  const paytableFrame = scaled(rect(content.x, content.y + (content.height - panelHeight) / 2, panelWidth, panelHeight), 390, 620);
  const paytable = {
    ...paytableFrame,
    iconSize: Math.max(44, Math.min(140, panelWidth / 3.8, panelHeight * 0.21)),
    prizeSize: Math.max(40, Math.min(110, panelHeight * 0.16)),
  };
  const chipTray = scaled(rect(content.x + content.width - panelWidth, content.y + (content.height - panelHeight) / 2, panelWidth, panelHeight), 390, 620);
  return { orientation, viewport, safeBounds, background, paytable, machine, chipTray, ...overlays(machine, titlePlacement) };
}
