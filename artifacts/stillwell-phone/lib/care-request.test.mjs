import test from "node:test";
import assert from "node:assert/strict";
import {
  isPlausibleToken, careRequestErrorCode, careRequestErrorDetails,
  httpStatus, doctorName, initials, formatRequestDate, requestTokenFromLink,
} from "./care-request.ts";

test("request links accept only the Phase 1 token format",()=>{
  assert.equal(isPlausibleToken("a".repeat(43)),true);
  assert.equal(isPlausibleToken("_".repeat(42)+"-"),true);
  for(const value of ["",null,["a".repeat(43)],"a".repeat(42),"a".repeat(44),"a/".repeat(21)+"a","%".repeat(43)])
    assert.equal(isPlausibleToken(value),false);
});
test("native and Expo Go request links extract only valid path tokens",()=>{
  const token="a".repeat(43);
  assert.equal(requestTokenFromLink(`stillwell-phone://request/${token}`),token);
  assert.equal(requestTokenFromLink(`exp://preview.example/--/request/${token}?test=1`),token);
  assert.equal(requestTokenFromLink(`https://preview.example/request/${token}#fragment`),token);
  assert.equal(requestTokenFromLink(`stillwell-phone:///?next=/request/${token}`),null);
});
test("malformed encoded links never crash the root request provider",()=>{
  for(const path of ["/request/%E0%A4%A","/request/%ZZ","/request/","/request/short","/something-else"])
    assert.doesNotThrow(()=>assert.equal(requestTokenFromLink(path),null));
});
test("only structured known API states control the request flow",()=>{
  for(const code of ["expired","withdrawn","different_email","unverified_email","clinician_account","already_sharing","care_team_full","journal_required","already_accepted"])
    assert.equal(careRequestErrorCode({data:{code}}),code);
  assert.equal(careRequestErrorCode({data:{code:"cancelled"}}),"withdrawn");
  assert.equal(careRequestErrorCode({data:{code:"unrecognized"}}),null);
  assert.equal(careRequestErrorCode(new Error("expired")),null);
});
test("already-used and actively sharing are distinct states",()=>{
  assert.notEqual(careRequestErrorCode({data:{code:"already_accepted"}}),careRequestErrorCode({data:{code:"already_sharing"}}));
});
test("authenticated edge metadata permits only the declared request details",()=>{
  const request={clinicianName:"Alex Sample",clinicianFirstName:"Alex",clinicianLastName:"Sample",
    clinicianEmail:"clinician@example.com",requestedAt:"2026-10-21T00:00:00Z",expiresAt:"2026-11-04T00:00:00Z"};
  assert.deepEqual(careRequestErrorDetails({data:{request:{...request,journal:"must not pass through",token:"must not pass through"}}}),request);
  for(const error of [undefined,{}, {data:{}},{data:{request:null}},{data:{request:{expiresAt:request.expiresAt}}}])
    assert.equal(careRequestErrorDetails(error),null);
});
test("HTTP status extraction does not use arbitrary message strings",()=>{
  assert.equal(httpStatus({status:404}),404);
  assert.equal(httpStatus({status:"404"}),null);
  assert.equal(httpStatus({message:"404"}),null);
});
test("clinician headings use the name without doubling a full-name prefix",()=>{
  assert.equal(doctorName({lastName:"Sample",fullName:"Alex Sample"}),"Dr. Sample");
  assert.equal(doctorName({fullName:"Dr. Alex Sample"}),"Dr. Sample");
  assert.equal(doctorName({}),"Your clinician");
});
test("initials use the clinician name, with a safe absent-name fallback",()=>{
  assert.equal(initials("Dr. Alex Sample"),"AS");
  assert.equal(initials("Alex"),"A");
  assert.equal(initials(""),"?");
});
test("request dates are human readable and invalid dates do not crash a screen",()=>{
  assert.ok(formatRequestDate("2026-11-04T12:00:00Z").length>0);
  assert.equal(formatRequestDate(""),"");
  assert.equal(formatRequestDate("not a date"),"");
});
