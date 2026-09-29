import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { getAssetEntry, loadAudioAssets, loadInitialAssets, parseAssetManifest } from "../../src/assets";

async function realManifest() {
  return parseAssetManifest(JSON.parse(await readFile("public/assets/manifest.json", "utf8")));
}

describe("asset loader", () => {
  it("parses manifest and resolves entries by key", async () => {
    const manifest = await realManifest();
    expect(getAssetEntry(manifest, "emblem.neos.pulse").file).toBe("emblem/neos-pulse.svg");
    expect(() => getAssetEntry(manifest, "missing")).toThrow("Unknown asset key: missing");
  });

  it("rejects duplicate keys", async () => {
    const manifest = await realManifest();
    manifest.assets.push({ ...manifest.assets[0] });
    expect(() => parseAssetManifest(manifest)).toThrow(`Duplicate asset key: ${manifest.assets[0].key}`);
  });

  it("registers every group but defers audio loading until PLAY", async () => {
    const manifest = await realManifest();
    const fetcher = vi.fn(async () => new Response(JSON.stringify(manifest), { status: 200 }));
    const assets = { addBundle: vi.fn(), loadBundle: vi.fn(async (_group: string) => ({})) };
    await loadInitialAssets(fetcher, assets as never);
    expect(assets.addBundle).toHaveBeenCalledTimes(manifest.groups.length);
    expect(assets.loadBundle.mock.calls.map(([group]) => group)).toEqual(manifest.groups.filter((group) => group !== "audio"));
    await loadAudioAssets(assets as never);
    expect(assets.loadBundle).toHaveBeenLastCalledWith("audio");
  });
});
