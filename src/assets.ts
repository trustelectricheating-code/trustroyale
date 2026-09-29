import { Assets } from "pixi.js";

export const ASSET_GROUPS = ["background", "cabinet", "symbols", "faces", "emblem", "fx", "ui", "fonts", "audio"] as const;
export const INITIAL_ASSET_GROUPS = ["symbols", "faces", "emblem", "fx"] as const;
export type AssetGroup = (typeof ASSET_GROUPS)[number];
export type AssetStatus = "needed" | "placeholder" | "draft" | "approved";
export type AssetSource = "supplied" | "generated" | "cc0" | "licensed" | "custom";

export interface AssetEntry {
  key: string;
  group: AssetGroup;
  file: string;
  status: AssetStatus;
  source: AssetSource;
  licence?: string;
  sourceUrl: string | null;
  notes?: string;
}

export interface AssetManifest { version: 1; groups: AssetGroup[]; assets: AssetEntry[] }
type AssetApi = Pick<typeof Assets, "addBundle" | "loadBundle">;

export function parseAssetManifest(value: unknown): AssetManifest {
  if (!value || typeof value !== "object") throw new Error("Invalid asset manifest");
  const manifest = value as Partial<AssetManifest>;
  if (manifest.version !== 1 || !Array.isArray(manifest.groups) || !Array.isArray(manifest.assets)) throw new Error("Invalid asset manifest");
  if (manifest.groups.length !== ASSET_GROUPS.length || !ASSET_GROUPS.every((group, index) => manifest.groups?.[index] === group)) throw new Error("Invalid asset groups");

  const keys = new Set<string>();
  for (const entry of manifest.assets) {
    if (!entry || typeof entry.key !== "string" || typeof entry.file !== "string" || !ASSET_GROUPS.includes(entry.group)) throw new Error("Invalid asset entry");
    if (keys.has(entry.key)) throw new Error(`Duplicate asset key: ${entry.key}`);
    keys.add(entry.key);
  }
  return manifest as AssetManifest;
}

export function getAssetEntry(manifest: AssetManifest, key: string): AssetEntry {
  const entry = manifest.assets.find((candidate) => candidate.key === key);
  if (!entry) throw new Error(`Unknown asset key: ${key}`);
  return entry;
}

export function assetUrl(entry: AssetEntry): string { return `/assets/${entry.file}`; }

export function registerAssetBundles(manifest: AssetManifest, assets: AssetApi = Assets): void {
  for (const group of manifest.groups) {
    assets.addBundle(group, Object.fromEntries(manifest.assets.filter((entry) => entry.group === group).map((entry) => [entry.key, assetUrl(entry)])));
  }
}

export async function loadInitialAssets(fetcher: typeof fetch = fetch, assets: AssetApi = Assets): Promise<AssetManifest> {
  const response = await fetcher("/assets/manifest.json");
  if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
  const manifest = parseAssetManifest(await response.json());
  registerAssetBundles(manifest, assets);
  await Promise.all(INITIAL_ASSET_GROUPS.map((group) => assets.loadBundle(group)));
  return manifest;
}

export async function loadAudioAssets(assets: AssetApi = Assets): Promise<void> { await assets.loadBundle("audio"); }
