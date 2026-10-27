import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) return sourceFiles(url);
    return /\.(tsx?|html)$/.test(entry.name) ? [url] : [];
  }));
  return files.flat();
}

const artifacts = new URL("../../", import.meta.url);
for (const [surface, roots] of [
  ["patient website", ["website/src/"]],
  ["phone app", ["stillwell-phone/app/", "stillwell-phone/components/"]],
  ["clinician portal", ["clinicians/src/"]],
  ["design mockups", ["mockup-sandbox/src/"]],
]) {
  test(`${surface} contains no supplement content or interaction links`, async () => {
    for (const root of roots) {
      for (const file of await sourceFiles(new URL(root, artifacts))) {
        assert.doesNotMatch(await readFile(file, "utf8"), /supplement/i, file.pathname);
      }
    }
  });
}

test("landing page uses the treatment-recommendations boundary", async () => {
  const source = await readFile(new URL("website/src/App.tsx", artifacts), "utf8");
  assert.ok(source.includes(
    "No treatment recommendations, activity prescriptions, or per-person medical algorithms.",
  ));
});
