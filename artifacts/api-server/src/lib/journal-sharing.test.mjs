import assert from "node:assert/strict";
import test from "node:test";
import {
  canReadConnection,
  canPatientManageConnection,
  filterSharedJournalLog,
  transitionConnection,
} from "./journal-sharing.ts";

test("a patient can invite, clinician can accept, and patient can revoke access", () => {
  const invited = transitionConnection("none", "invite");
  assert.equal(invited, "pending");
  assert.equal(canReadConnection(invited, "clinician-a", "clinician-a"), false);

  const accepted = transitionConnection(invited, "accept");
  assert.equal(accepted, "accepted");
  assert.equal(canReadConnection(accepted, "clinician-a", "clinician-a"), true);
  assert.equal(canPatientManageConnection(accepted, "patient-a", "patient-a"), true);

  const revoked = transitionConnection(accepted, "revoke");
  assert.equal(revoked, "revoked");
  assert.equal(canReadConnection(revoked, "clinician-a", "clinician-a"), false);
  assert.equal(canPatientManageConnection(revoked, "patient-a", "patient-a"), false);
  assert.equal(transitionConnection(revoked, "accept"), null);
});

test("only the linked patient may revoke and only the linked clinician may read", () => {
  assert.equal(canPatientManageConnection("accepted", "patient-a", "patient-b"), false);
  assert.equal(canPatientManageConnection("pending", "patient-a", "patient-b"), false);
  assert.equal(canReadConnection("accepted", "clinician-a", "clinician-b"), false);
  assert.equal(canReadConnection("pending", "clinician-a", "clinician-a"), false);
});

test("re-inviting a revoked clinician returns the relationship to pending", () => {
  assert.equal(transitionConnection("revoked", "invite"), "pending");
  assert.equal(transitionConnection("accepted", "invite"), "accepted");
});

test("shared journal responses contain only the areas the patient selected", () => {
  const privateLog = {
    date: "2026-10-16",
    symptoms: [{ name: "fatigue", severity: 4 }],
    dietStatus: "done",
    dietNote: "Had lunch",
    exerciseStatus: "not_done",
    exerciseNote: "Rested",
    meditationStatus: "done",
    meditationMinutes: 5,
    meditationNote: "Quiet pause",
    note: "Took a break",
    updatedAt: "2026-10-16T12:00:00.000Z",
  };

  assert.deepEqual(
    filterSharedJournalLog(privateLog, ["food_hydration"]),
    { date: "2026-10-16", dietStatus: "done", dietNote: "Had lunch" },
  );
  assert.deepEqual(
    filterSharedJournalLog(privateLog, ["symptoms", "quiet_pause"]),
    {
      date: "2026-10-16",
      symptoms: [{ name: "fatigue", severity: 4 }],
      meditationStatus: "done",
      meditationMinutes: 5,
      meditationNote: "Quiet pause",
    },
  );
  assert.deepEqual(
    filterSharedJournalLog(privateLog, ["movement", "pacing"]),
    {
      date: "2026-10-16",
      exerciseStatus: "not_done",
      exerciseNote: "Rested",
      note: "Took a break",
    },
  );
  assert.equal(filterSharedJournalLog(privateLog, []), null);
});
