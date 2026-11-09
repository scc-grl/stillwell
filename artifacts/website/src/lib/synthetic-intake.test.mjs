import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../pages/SyntheticIntakePage.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../pages/DashboardPage.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

test("signed-in intake is patient-gated and consent precedes sample analysis", () => {
  assert.match(app, /Route path="\/dashboard\/intake"><AccountTypeGate required="patient">/);
  assert.ok(page.indexOf("useConsentRecoveryIntake") < page.indexOf("useRunRecoveryIntake"));
  assert.match(page, /consentMutation\.mutate\(\{ data: \{ consentAccepted: true, syntheticOnly: true \} \}/);
  assert.match(page, /I agree to this/);
  assert.match(page, /Not now · Dashboard/);
});

test("only allowlisted read-only samples are sent; personal typing is unavailable", () => {
  assert.match(page, /SYNTHETIC_INTAKE_SAMPLES/);
  assert.match(page, /sampleId, \.\.\.\(Object\.keys\(answered\)\.length \? \{ answered \} : \{\}\)/);
  assert.doesNotMatch(page, /textarea[^>]+onChange=/);
  assert.match(page, /<Textarea id="disabled-personal-note" disabled/);
  assert.match(page, /Dictation is disabled too/);
  assert.match(page, /never arbitrary text/);
});

test("synthetic review shows every returned symptom and sends tap ratings back to server", () => {
  assert.match(page, /decision\.symptoms\.map/);
  assert.match(page, /Array\.from\(\{ length: 11 \}/);
  assert.match(page, /mentioned_\$\{name\}.*noul: 1/s);
  assert.match(page, /symptom_\$\{name\}.*score: rating/s);
  assert.match(page, /readSample\(nextAnswers, "summary"\)/);
  assert.match(page, /PLACEMENT_REASONS\[reason\.rule\]/);
});

test("intake follows sample, reading, summary, then confirmed stage sequence", () => {
  assert.match(page, /ReadingScreen/);
  assert.match(page, /view === "reading"/);
  assert.match(page, /view === "summary"/);
  assert.match(page, /onClick=\{\(\) => setView\("stage"\)\}[^>]*data-testid="button-summary-confirm"/);
  assert.match(page, /view === "stage"/);
  assert.match(page, /This looks right/);
});

test("tap fallback uses shared question definitions and requires structured answers", () => {
  assert.match(page, /const tapQuestions = buildQuestions\(\)/);
  assert.match(page, /Object\.entries\(tapQuestions\)/);
  assert.match(page, /value: 0\.5/);
  assert.match(page, /question\.criteria/);
  assert.match(page, /unansweredQuestionCount > 0/);
  assert.match(page, /readSample\(tapAnswers, "tap-questions"\)/);
  assert.match(page, /required paired placeholder/);
});

test("emergency warning has no added actions and receives the selected fixed sample", () => {
  const warning = page.slice(page.indexOf('if (decision?.outcome === "go_to_er")'), page.indexOf('if (decision?.outcome === "crisis_support")'));
  assert.doesNotMatch(warning, /<Button/);
  assert.match(warning, /EmergencyScreen quotes=\{\[selectedSample\.story\]\}/);
});

test("dashboard labels the persisted sample stage as development-only synthetic data", () => {
  assert.match(dashboard, /import\.meta\.env\.DEV/);
  assert.match(dashboard, /stage\.syntheticOnly/);
  assert.match(dashboard, /NOT YOUR MEDICAL STAGE/);
});
