import { CABINET_ART, CABINET_DESIGN } from "./cabinetArt";

export interface SafeAreaInsets { top: number; right: number; bottom: number; left: number }
export interface LayoutRect { x: number; y: number; width: number; height: number }

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

const MACHINE_ASPECT = CABINET_DESIGN.width / CABINET_DESIGN.height;

function rect(x: number, y: number, width: number, height: number): LayoutRect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

function scaled(frame: LayoutRect, designWidth: number, designHeight: number) {
  return { ...frame, scale: Math.min(frame.width / designWidth, frame.height / designHeight) };
}

function overlays(machine: SceneLayout["machine"]): Pick<SceneLayout, "marquee" | "spinButton"> {
  const marquee = scaled(rect(
    machine.x + machine.width * 0.13,
    machine.y + machine.height * 0.055,
    machine.width * 0.74,
    machine.height * 0.145,
  ), 800, 170);
  const scale = machine.scale;
  const button = CABINET_ART.spinButton;
  const spinButton = scaled(rect(
    machine.x + button.x * scale,
    machine.y + button.y * scale,
    button.width * scale,
    button.height * scale,
  ), button.width, button.height);
  return { marquee, spinButton };
}

export function computeLayout(width: number, height: number, safeAreaInsets: SafeAreaInsets): SceneLayout {
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

  if (orientation === "portrait") {
    const gap = Math.max(5, Math.min(14, content.height * 0.012));
    const paytableHeight = Math.max(58, Math.min(116, content.height * 0.12));
    const availableHeight = content.height - paytableHeight - gap;
    const machineHeight = Math.min(availableHeight, content.width / MACHINE_ASPECT);
    const machineWidth = machineHeight * MACHINE_ASPECT;
    const machineY = content.y + paytableHeight + gap + (availableHeight - machineHeight) * 0.48;
    const machine = scaled(rect(content.x + (content.width - machineWidth) / 2, machineY, machineWidth, machineHeight), CABINET_DESIGN.width, CABINET_DESIGN.height);
    const paytable = scaled(rect(content.x, content.y, content.width, paytableHeight), 960, 150);
    const wheelSize = Math.min(content.width * 0.48, machine.height * 0.27);
    const chipTray = scaled(rect(content.x + content.width - wheelSize, machine.y + machine.height * 0.1, wheelSize, wheelSize), 560, 560);
    return { orientation, viewport, safeBounds, background, paytable, machine, chipTray, ...overlays(machine) };
  }

  const machineHeight = content.height;
  const machineWidth = machineHeight * MACHINE_ASPECT;
  const machine = scaled(rect(content.x + (content.width - machineWidth) / 2, content.y, machineWidth, machineHeight), CABINET_DESIGN.width, CABINET_DESIGN.height);
  const sideGap = Math.max(8, Math.min(28, content.width * 0.014));
  const sideWidth = Math.max(0, (content.width - machineWidth) / 2 - sideGap * 2);
  const panelWidth = Math.min(sideWidth, content.height * 0.58);
  const panelHeight = Math.min(content.height * 0.72, panelWidth * 1.35);
  const paytable = scaled(rect(content.x, content.y + (content.height - panelHeight) / 2, panelWidth, panelHeight), 390, 620);
  const chipTray = scaled(rect(content.x + content.width - panelWidth, content.y + (content.height - panelHeight) / 2, panelWidth, panelHeight), 390, 620);
  return { orientation, viewport, safeBounds, background, paytable, machine, chipTray, ...overlays(machine) };
}
