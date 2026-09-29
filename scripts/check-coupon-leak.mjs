import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const fallbacks = ["ROYALE10", "ROYALE15", "ROYALE20"];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}

for (const file of await files("dist")) {
  const contents = await readFile(file);
  for (const fallback of fallbacks) {
    if (contents.includes(Buffer.from(fallback))) throw new Error(`Coupon code leaked into client bundle: ${fallback} in ${file}`);
  }
}

console.log("Client bundle contains no fallback coupon codes.");
