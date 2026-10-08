import sharp from "sharp";
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const [source, ...coordinates] = process.argv.slice(2);
const [left, top, width, height] = coordinates.map(Number);
if (!source || coordinates.length !== 4 ||
    ![left, top, width, height].every(Number.isInteger) ||
    left < 0 || top < 0 || width <= 0 || height <= 0) {
  throw new Error("Usage: node scripts/retain-rendered-logo.mjs source-image left top width height");
}
const output = fileURLToPath(new URL("../public/logo.png", import.meta.url));
const retained = fileURLToPath(new URL("../docs/references/logos/logo.png", import.meta.url));
await sharp(source).extract({ left, top, width, height }).png().toFile(output);
await copyFile(output, retained);
console.log("Retained the source capture's logo pixels in public/ and docs/references/logos/.");
