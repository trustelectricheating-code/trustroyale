import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const assetRoot = path.join(root, "public", "assets");
const manifest = JSON.parse(await readFile(path.join(assetRoot, "manifest.json"), "utf8"));
const groups = ["background", "cabinet", "symbols", "faces", "emblem", "fx", "ui", "fonts", "audio"];
const statuses = new Set(["needed", "placeholder", "draft", "approved"]);
const sources = new Set(["supplied", "generated", "cc0", "licensed", "custom"]);
const errors = [];

if (manifest.version !== 1) errors.push("version must be 1");
if (JSON.stringify(manifest.groups) !== JSON.stringify(groups)) errors.push("groups must match contract order");
if (!Array.isArray(manifest.assets)) errors.push("assets must be an array");

const seen = new Set();
let lastGroup = -1;
for (const [index, asset] of (manifest.assets ?? []).entries()) {
  const prefix = `assets[${index}] (${asset.key ?? "missing key"})`;
  if (!asset.key || seen.has(asset.key)) errors.push(`${prefix}: key missing or duplicate`);
  seen.add(asset.key);
  const groupIndex = groups.indexOf(asset.group);
  if (groupIndex < 0) errors.push(`${prefix}: invalid group ${asset.group}`);
  if (groupIndex < lastGroup) errors.push(`${prefix}: group order is not stable`);
  lastGroup = Math.max(lastGroup, groupIndex);
  if (!statuses.has(asset.status)) errors.push(`${prefix}: invalid status ${asset.status}`);
  if (!sources.has(asset.source)) errors.push(`${prefix}: invalid source ${asset.source}`);
  if (asset.source !== "supplied" && !asset.licence) errors.push(`${prefix}: licence required`);
  if (!(typeof asset.sourceUrl === "string" || asset.sourceUrl === null)) errors.push(`${prefix}: sourceUrl must be string or null`);
  if (!asset.file || path.isAbsolute(asset.file) || asset.file.includes("..")) {
    errors.push(`${prefix}: file must stay under public/assets`);
  } else {
    try { await access(path.join(assetRoot, asset.file)); } catch { errors.push(`${prefix}: missing file ${asset.file}`); }
  }
  if (process.env.VERCEL_ENV === "production" && asset.status === "needed") errors.push(`${prefix}: needed asset blocks production`);
}

for (const fallback of ["audio/sfx-sprite.mp3", "audio/ambient-loop.mp3", "audio/sprite.json"]) {
  try { await access(path.join(assetRoot, fallback)); } catch { errors.push(`missing audio fallback ${fallback}`); }
}

if (errors.length) {
  console.error(`Asset manifest invalid:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}

console.log(`Asset manifest valid: ${manifest.assets.length} entries, ${new Set(manifest.assets.map((asset) => asset.file)).size} files.`);
