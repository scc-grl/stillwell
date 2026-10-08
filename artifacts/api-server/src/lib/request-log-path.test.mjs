import assert from "node:assert/strict";
import { test } from "node:test";
import { requestLogPath } from "./request-log-path.ts";

test("journal dates and query values never appear in access-log paths", () => {
  assert.equal(requestLogPath("/api/recovery/logs/2026-10-07"), "/api/recovery/logs/:date");
  assert.equal(requestLogPath("/api/recovery/logs/2026-10-08?ownerId=private"), "/api/recovery/logs/:date");
  assert.equal(requestLogPath("/api/recovery?ownerId=private"), "/api/recovery");
});

test("auth proxy resources do not expose identifiers", () => {
  assert.equal(requestLogPath("/api/__clerk/v1/client/sessions/private"), "/api/__clerk/:resource");
});

test("safe route names remain useful and absent URLs remain absent", () => {
  assert.equal(requestLogPath("/api/healthz"), "/api/healthz");
  assert.equal(requestLogPath("/api/recovery/start"), "/api/recovery/start");
  assert.equal(requestLogPath(undefined), undefined);
});
