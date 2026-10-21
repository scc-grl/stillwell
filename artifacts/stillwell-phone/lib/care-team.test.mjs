import test from "node:test";
import assert from "node:assert/strict";
import { resendState, isValidEmail, normalizeEmail, fullName, sentLabel, formatLong, errorCode, isOffline, OfflineError, UNDO_WINDOW_MS, TOAST_MS } from "./care-team.ts";
const sentAt="2026-10-21T12:00:00.000Z";
const invite={sentAt,lastResendAt:null};
const start=new Date(sentAt).getTime();

test("email validation and normalization match invitation input",()=>{
  for(const email of ["","person","person@","person@domain","person name@example.com",`${"a".repeat(255)}@example.com`]) assert.equal(isValidEmail(email),false);
  assert.equal(isValidEmail(" Person@Example.com "),true);
  assert.equal(normalizeEmail(" Person@Example.com "),"person@example.com");
});
test("cooldown is disabled until exactly ten minutes and rounds remaining minutes up",()=>{
  assert.deepEqual(resendState(invite,undefined,start),{available:false,reason:"cooldown",minutes:10});
  assert.deepEqual(resendState(invite,undefined,start+9*60000+1),{available:false,reason:"cooldown",minutes:1});
  assert.deepEqual(resendState(invite,undefined,start+10*60000),{available:true});
});
test("resending restarts cooldown from the latest send",()=>{
  const resent={...invite,lastResendAt:"2026-10-21T12:10:00.000Z"};
  assert.deepEqual(resendState(resent,undefined,start+15*60000),{available:false,reason:"cooldown",minutes:5});
});
test("daily limit overrides cooldown but becomes available after the server reset",()=>{
  const quota={used:10,limit:10,resetsAt:"2026-10-22T00:00:00.000Z"};
  assert.deepEqual(resendState(invite,quota,start),{available:false,reason:"quota"});
  assert.deepEqual(resendState(invite,quota,new Date(quota.resetsAt).getTime()),{available:true});
});
test("row labels use calendar dates and patient-facing names",()=>{
  assert.equal(fullName({firstName:"Ava",lastName:"Example"}),"Ava Example");
  assert.equal(sentLabel(sentAt,start),"Sent today");
  assert.match(sentLabel(sentAt,start+86400000),/^Sent /);
  assert.ok(formatLong(sentAt).length>0);
});
test("only structured API error codes are read; offline has a dedicated message",()=>{
  assert.equal(errorCode({data:{code:"already_connected",error:"private"}}),"already_connected");
  assert.equal(errorCode(new Error("private")),null);
  assert.equal(errorCode({data:{code:10}}),null);
  assert.equal(isOffline(new OfflineError()),true);
  assert.equal(isOffline(new Error()),false);
});
test("Undo lasts five seconds and ordinary success toast lasts four",()=>{
  assert.equal(UNDO_WINDOW_MS,5000);assert.equal(TOAST_MS,4000);
});
