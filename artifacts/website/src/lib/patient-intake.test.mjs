import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../pages/PatientIntakePage.tsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../components/IntakeStoryEditor.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../pages/MvpPatientPages.tsx", import.meta.url), "utf8");
const backend = readFileSync(new URL("../../../api-server/src/lib/web-mvp.ts", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

test("patient route remains patient-gated and uses the current status and consent APIs", () => {
  assert.match(app, /Route path="\/dashboard\/intake"><AccountTypeGate required="patient"><PatientIntakePage\/>/);
  assert.match(page, /useGetRecoveryIntakeStatus/);
  assert.match(page, /getGetRecoveryIntakeStatusQueryKey\(\)/);
  assert.match(page, /consentMutation\.mutate\(\{ data: \{ consentAccepted: true \} \}/);
  assert.doesNotMatch(page, /syntheticOnly:\s*true|sampleId|SYNTHETIC_INTAKE_SAMPLES/);
});

test("consent is explicit and a patient story editor is only mounted after a successful consent response", () => {
  assert.ok(page.indexOf("useConsentRecoveryIntake") < page.indexOf("IntakeStoryEditor"));
  assert.match(page, /onSuccess: \(savedConsent\) => \{\s*if \(requestUser !== currentUser\.current\) return;\s*setConsent\(\{ id: savedConsent\.id \}\)/);
  assert.match(page, /\{consent && statusQuery\.data\?\.enabled === true && view === "story" && <IntakeStoryEditor/);
  assert.match(page, /TypeSafe reads the story and intake answers/);
  assert.match(page, /profile, name, email, and ID are not sent/);
  assert.match(page, /saved privately to your account/);
  assert.match(page, /not saved or traced by Stillwell as raw story text/);
  assert.match(page, /basic email and phone filter is not full de-identification/);
  assert.match(page, /INTAKE_CONSENT_VERSION/);
});

test("story requests contain only consent, story, and optional structured answers", () => {
  assert.match(page, /data: \{ consentId: consent\.id, story: story\.trim\(\), \.\.\.\(Object\.keys\(answered\)\.length \? \{ answered \} : \{\}\) \}/);
  assert.doesNotMatch(page, /data:\s*\{[^}]*\b(?:accountId|userId|email)\s*:/);
  assert.match(page, /onError: \(\) => \{\s*if \(requestUser !== currentUser\.current\) return;\s*setView\(returnTo\);/);
  assert.match(page, /Your story and answers are still here/);
});

test("dictation is browser-native, bounded, and offers keyboard alternatives without storing audio", () => {
  assert.match(editor, /SpeechRecognition\?\:/);
  assert.match(editor, /webkitSpeechRecognition\?\:/);
  assert.match(editor, /Stillwell does not keep audio/);
  assert.match(editor, /use your device keyboard’s dictation/);
  assert.match(editor, /maxLength=\{4000\}/);
  assert.match(editor, /addition\.length > 4000/);
  assert.match(editor, /This dictation would exceed the 4,000-character limit/);
  assert.match(editor, /recognitionRef\.current\?\.stop\(\)/);
  assert.match(editor, /onClick=\{submit\}/);
  assert.match(editor, /useEffect\(\(\) => \(\) => detachRecognition\(\), \[\]\)/);
  assert.match(editor, /active\.onresult = null/);
  assert.match(editor, /disabled=\{!story\.trim\(\) \|\| pending \|\| listening\}/);
});
test("account changes discard in-memory story and ignore old in-flight results", () => {
  assert.match(page, /setStory\(""\); setConsent\(null\); setResult\(null\); setTapAnswers\(\{\}\)/);
  assert.match(page, /\}, \[userId\]\)/);
  assert.match(page, /queryKey: \[\.\.\.getGetRecoveryStagesQueryKey\(\), userId\]/);
  assert.match(dashboard, /getGetMvpRecoveryQueryKey\(\), owner/);
  assert.match(page, /if \(requestUser !== currentUser\.current\) return;/);
});

test("disabled status provides journal access without mounting story controls", () => {
  assert.match(page, /statusQuery\.data\?\.enabled === false/);
  assert.match(page, /data-testid="card-intake-disabled"/);
  assert.match(page, /You can continue using your private journal/);
  assert.match(page, /<Link href="\/dashboard">Return to dashboard/);
  assert.match(page, /statusQuery\.data\?\.enabled !== true/);
});

test("summary preserves editable story and structured 0–10 symptom ratings", () => {
  assert.match(page, /Object\.entries\(tapQuestions\)/);
  assert.match(page, /Array\.from\(\{ length: 11 \}/);
  assert.match(page, /answerQuestion\(key, \{ score: rating \}\)/);
  assert.match(page, /button-edit-patient-story/);
  assert.match(page, /setView\("story"\)/);
  assert.match(page, /PLACEMENT_REASONS\[reason\.rule\]/);
  assert.match(page, /This looks right/);
});

test("emergency screen receives the local story and adds no warning buttons", () => {
  const warning = page.slice(page.indexOf('if (decision?.outcome === "go_to_er")'), page.indexOf('if (decision?.outcome === "crisis_support")'));
  assert.doesNotMatch(warning, /<Button/);
  assert.match(warning, /EmergencyScreen quotes=\{\[story\]\}/);
});

test("dashboard personal stage excludes synthetic history and provides Start intake", () => {
  assert.match(backend, /synthetic_only=false/);
  assert.match(dashboard, /useGetMvpRecovery/);
  assert.doesNotMatch(dashboard, /Pending clinician review/);
  assert.match(dashboard, /href="\/dashboard\/intake">Start intake/);
});
test("production dashboard intake follows server status, not a development build flag", () => {
  assert.match(page, /useGetRecoveryIntakeStatus/);
  assert.match(page, /statusQuery\.data\?\.enabled === true/);
  assert.doesNotMatch(page, /Development preview/);
  assert.doesNotMatch(page, /Pending clinician review|not a confirmed medical stage/);
});
