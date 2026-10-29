import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const phone = createRequire(new URL("../../artifacts/stillwell-phone/package.json", import.meta.url));
const website = createRequire(new URL("../../artifacts/website/package.json", import.meta.url));

test("Expo Router's CommonJS query-string uses the fixed ESM decoder", () => {
  const router = createRequire(phone.resolve("expo-router/package.json"));
  const queryString = router("query-string");
  assert.deepEqual(
    { ...queryString.parse("name=Stillwell%20Recovery&tag=one&tag=two&unicode=%E2%9C%93") },
    { name: "Stillwell Recovery", tag: ["one", "two"], unicode: "✓" },
  );
  assert.equal(queryString.stringify({ name: "Stillwell Recovery" }), "name=Stillwell%20Recovery");
  assert.doesNotThrow(() => queryString.parse("broken=%E0%A4%A&percent=%"));
});

test("Expo config resolves the safe merge adapter and xcode no longer needs uuid 7", () => {
  const expo = createRequire(phone.resolve("expo/package.json"));
  const config = createRequire(expo.resolve("@expo/config/package.json"));
  assert.equal(config("deepmerge/package.json").name, "@workspace/expo-config-merge");
  assert.deepEqual(
    config("deepmerge")({ ios: { supportsTablet: true } }, { ios: { bundleIdentifier: "test" } }),
    { ios: { supportsTablet: true, bundleIdentifier: "test" } },
  );
  const plugins = createRequire(expo.resolve("@expo/config-plugins/package.json"));
  const project = plugins("xcode").project("test.pbxproj");
  // UUID generation expects a parsed project's object sections.
  project.hash = { project: { objects: {} } };
  assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
  assert.equal(plugins("xcode/package.json").version, "4.0.0");
});

test("Zod 4 form resolver returns field errors and accepts valid form values", async () => {
  const { z } = website("zod");
  const { zodResolver } = website("@hookform/resolvers/zod");
  const resolver = zodResolver(z.object({ email: z.string().email() }));
  const options = { fields: {}, shouldUseNativeValidation: false };
  const valid = await resolver({ email: "fixture@example.test" }, {}, options);
  assert.deepEqual(valid, { values: { email: "fixture@example.test" }, errors: {} });
  const invalid = await resolver({ email: "not-an-email" }, {}, options);
  assert.deepEqual(invalid.values, {});
  assert.equal(invalid.errors.email.type, "invalid_format");
});
