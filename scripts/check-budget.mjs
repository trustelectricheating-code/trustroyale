import { gzipSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const JS_GZIP_LIMIT = 250 * 1024;
const PREPLAY_LIMIT = 4 * 1024 * 1024;
const PREPLAY_DIRECTORIES = ["symbols", "faces", "emblem", "fx", "ui", "fonts", "mock"];

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(file) : [file];
  }))).flat();
}

const distFiles = await filesBelow("dist");
const assetFiles = await filesBelow("dist/assets");
const jsFiles = distFiles.filter((file) => file.endsWith(".js"));
const cssFiles = distFiles.filter((file) => file.endsWith(".css"));
const preplayAssets = assetFiles.filter((file) => PREPLAY_DIRECTORIES.includes(path.relative("dist/assets", file).split(path.sep)[0]));
const jsGzip = (await Promise.all(jsFiles.map(async (file) => gzipSync(await readFile(file)).byteLength))).reduce((sum, bytes) => sum + bytes, 0);
const preplay = (await Promise.all([...jsFiles, ...cssFiles, ...preplayAssets].map(async (file) => (await stat(file)).size))).reduce((sum, bytes) => sum + bytes, 0);

console.log(`Budget: JS gzip ${(jsGzip / 1024).toFixed(1)} KB / 250 KB; pre-PLAY ${(preplay / 1024 / 1024).toFixed(2)} MB / 4 MB.`);
if (jsGzip > JS_GZIP_LIMIT) throw new Error(`JS gzip budget exceeded: ${jsGzip} > ${JS_GZIP_LIMIT} bytes`);
if (preplay > PREPLAY_LIMIT) throw new Error(`Pre-PLAY transfer budget exceeded: ${preplay} > ${PREPLAY_LIMIT} bytes`);
