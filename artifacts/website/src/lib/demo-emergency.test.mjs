import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/demo-intake/StoryScreens.tsx", import.meta.url), "utf8");
const emergency = source.slice(source.indexOf("export function EmergencyScreen"));

test("demo emergency warning contains the approved copy in order", () => {
  const copy = [
    "Please get emergency care now",
    "emergency-story-quote",
    "Please go to your nearest emergency center now, or call 911.",
    "Don't drive yourself. Ask someone to take you.",
    "If someone is with you, show them this screen.",
    "Stillwell has paused your intake. You can come back to it after you've been seen.",
  ];
  let previous = -1;
  for (const text of copy) {
    const position = emergency.indexOf(text);
    assert.ok(position > previous, `Missing or out-of-order emergency copy: ${text}`);
    previous = position;
  }
  assert.match(emergency, /role="alert"/);
  assert.match(emergency, /“\{story\}”/);
});

test("demo emergency warning has no buttons or action links", () => {
  assert.doesNotMatch(emergency, /<(?:Button|button|a)\b|tel:911|google\.com\/maps/);
  assert.match(emergency, /<CareBoundary \/>/);
});
