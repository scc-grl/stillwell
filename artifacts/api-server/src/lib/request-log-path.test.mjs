import assert from "node:assert/strict";
import { test } from "node:test";
import { requestLogPath, careLinkSecurityHeaders } from "./request-log-path.ts";

test("care-link HTML prevents referrer leaks, caching, indexing and off-origin analytics",()=>{
  for(const path of ["/invite/private-token","/request/private-token?return=ignored","/INVITE/private-token/nested"]) {
    const headers=careLinkSecurityHeaders(path);
    assert.equal(headers["Content-Security-Policy"],"connect-src 'self'");
    assert.equal(headers["Referrer-Policy"],"no-referrer");
    assert.equal(headers["Cache-Control"],"private, no-store");
    assert.match(headers["X-Robots-Tag"],/noindex/);
    assert.ok(!JSON.stringify(headers).includes("private-token"));
  }
  assert.deepEqual(careLinkSecurityHeaders("/"),{});
  assert.deepEqual(careLinkSecurityHeaders("/privacy"),{});
});

test("case-insensitive Express token routes cannot bypass log redaction",()=>{
  for(const path of [
    "/API/CARE-TEAM/REQUESTS/private-token/PREVIEW?email=private",
    "/Api/Patient/Care-Team/Requests/private-token",
    "/Api/Clinician/Care-Team/Invites/private-token/accept",
    "/REQUEST/private-token",
    "/API/INVITE/private-token",
  ]) {
    const result=requestLogPath(path);
    assert.ok(!result.includes("private-token"));
    assert.ok(!result.includes("?"));
  }
});

test("journal dates and query values never appear in access-log paths", () => {
  assert.equal(requestLogPath("/api/recovery/logs/2026-10-07"), "/api/recovery/logs/:date");
  assert.equal(requestLogPath("/api/recovery/logs/2026-10-08?ownerId=private"), "/api/recovery/logs/:date");
  assert.equal(requestLogPath("/api/recovery?ownerId=private"), "/api/recovery");
});

test("auth proxy resources do not expose identifiers", () => {
  assert.equal(requestLogPath("/api/__clerk/v1/client/sessions/private"), "/api/__clerk/:resource");
});

test("journal-sharing connection identifiers never appear in access-log paths", () => {
  assert.equal(
    requestLogPath("/api/patient/clinician-connections/11614d9a-726d-4f8c-9a45-753ef123b832"),
    "/api/patient/clinician-connections/:id",
  );
  assert.equal(
    requestLogPath("/api/clinician/invitations/11614d9a-726d-4f8c-9a45-753ef123b832/accept"),
    "/api/clinician/invitations/:id/accept",
  );
  assert.equal(
    requestLogPath("/api/clinician/patients/11614d9a-726d-4f8c-9a45-753ef123b832"),
    "/api/clinician/patients/:connectionId",
  );
});

test("safe route names remain useful and absent URLs remain absent", () => {
  assert.equal(requestLogPath("/api/healthz"), "/api/healthz");
  assert.equal(requestLogPath("/api/recovery/start"), "/api/recovery/start");
  assert.equal(requestLogPath(undefined), undefined);
});
