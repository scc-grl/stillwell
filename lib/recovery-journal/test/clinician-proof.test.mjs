import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CLINICIAN_PROOF_LABEL, CLINICIAN_PROOF_DESCRIPTION } from "../src/care-team-copy.ts";

const source = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

test("clinician proof label and explanation use the approved shared copy", () => {
  assert.equal(CLINICIAN_PROOF_LABEL, "Proof-of-concept");
  assert.equal(CLINICIAN_PROOF_DESCRIPTION, "Clinician tools are an early proof-of-concept. Clinician identities aren't verified, and features may change.");
  for (const file of [
    "lib/clinician-care-portal/src/ProofOfConceptBanner.tsx",
    "artifacts/stillwell-phone/components/ClinicianProofOfConcept.tsx",
  ]) {
    const text = source(file);
    assert.match(text, /@workspace\/recovery-journal\/care-team-copy/);
    assert.match(text, /CLINICIAN_PROOF_LABEL/);
    assert.match(text, /CLINICIAN_PROOF_DESCRIPTION/);
  }
});

test("accent badge text meets 4.5:1 contrast in both shared themes", () => {
  const generated = source("artifacts/stillwell-design-system/src/generated/tokens.tsx");
  const tokens = JSON.parse(generated.match(/export const tokens = ([\s\S]*?) as const;/)[1]);
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const theme of ["light", "dark"]) {
    const colors = tokens.color[theme];
    const [light, dark] = [luminance(colors.accent), luminance(colors.accentForeground)].sort((a, b) => b - a);
    assert.ok((light + 0.05) / (dark + 0.05) >= 4.5, `${theme} accent contrast`);
  }
});

test("web clinician shells place the shared banner below navigation, including auth pages", () => {
  for (const file of [
    "artifacts/clinicians/src/components/portal-shell.tsx",
    "lib/clinician-care-portal/src/CarePortal.tsx",
  ]) {
    const text = source(file);
    assert.match(text, /<ProofOfConceptBanner \/>[\s\n]*<\/header>/);
    assert.doesNotMatch(text, /<ProofOfConceptBadge/);
  }
  const app = source("artifacts/clinicians/src/App.tsx");
  assert.match(app, /!pageHasHeader && <PortalHeader \/>/);
  const patientApp = source("artifacts/website/src/App.tsx");
  assert.doesNotMatch(patientApp, /<ProofOfConcept(?:Badge|Banner)/);
});

test("phone badge is guarded by clinician route or explicitly selected clinician auth role", () => {
  const screen = source("artifacts/stillwell-phone/components/Screen.tsx");
  assert.match(screen, /clinicianScreen &&/);
  assert.match(screen, /clinician \?\? \/\^/);
  assert.match(source("artifacts/stillwell-phone/app/auth.tsx"), /<Screen clinician=\{role === "clinician"\}>/);
  for (const page of ["clinician-home", "clinician-join", "clinician-profile"]) {
    assert.match(source(`artifacts/stillwell-phone/app/${page}.tsx`), /<Screen/);
  }
  assert.match(source("artifacts/stillwell-phone/app/clinician-message.tsx"), /Redirect href="\/clinician-home"/);
});
