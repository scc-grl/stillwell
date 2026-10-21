import test from "node:test";
import assert from "node:assert/strict";
import { allowedRequestOrigin } from "./request-origin.ts";

test("native and same-origin requests keep their existing origin behavior",()=>{
  assert.equal(allowedRequestOrigin({}),true);
  assert.equal(allowedRequestOrigin({origin:"https://app.example",host:"app.example"}),true);
});
test("only the configured HTTPS Expo preview with explicit bearer authorization is admitted",()=>{
  const request={origin:"https://phone.example",host:"app.example",authorization:"Bearer token"};
  assert.equal(allowedRequestOrigin(request,"phone.example"),true);
  assert.equal(allowedRequestOrigin({...request,authorization:undefined},"phone.example"),false);
  assert.equal(allowedRequestOrigin({...request,origin:"http://phone.example"},"phone.example"),false);
  assert.equal(allowedRequestOrigin({...request,origin:"https://evil.example"},"phone.example"),false);
  assert.equal(allowedRequestOrigin(request,""),false);
  assert.equal(allowedRequestOrigin({...request,origin:"invalid"},"phone.example"),false);
});
