import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  PENDING_CARE_LINK_KEY, ACCEPTED_INVITE_KEY, PENDING_CARE_LINK_TTL_MS,
  ACCEPTED_INVITE_TTL_MS, parseCareLinkPath, containsCareLinkToken,
  openPendingCareLink, readPendingCareLink, updatePendingCareLink,
  clearPendingCareLink, preserveTokenForSwitch, reconcilePendingCareLink,
  pendingCareLinkReturnPath, pendingCareLinkEmail,
  writeAcceptedInviteHandoff, consumeAcceptedInviteHandoff,
} from "../src/care-link-handoff.ts";

const token="a".repeat(43), other="b".repeat(43), now=1_790_000_000_000;
function storage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}
test("care links parse canonical and encoded tokens, never arbitrary redirect destinations",()=>{
  assert.deepEqual(parseCareLinkPath(`/invite/${token}?ignored=true`),{kind:"invite",token});
  assert.deepEqual(parseCareLinkPath(`/request/${"%61".repeat(43)}`),{kind:"request",token});
  for(const path of ["/invite/%ZZ", "/invite/short", `/request/${token}/extra`, "/request/https%3A%2F%2Fevil.example"])
    assert.equal(parseCareLinkPath(path),null);
});
test("privacy matching covers malformed, encoded and mixed-case bearer-link paths",()=>{
  for(const path of ["/invite/short","/REQUEST/anything",`/request/${"%61".repeat(43)}`])
    assert.equal(containsCareLinkToken(path),true);
  assert.equal(containsCareLinkToken("/resources"),false);
});
test("pending handoff has a bounded lifetime and returns only a canonical local route",()=>{
  const s=storage();
  openPendingCareLink(s,"invite",token,null,now);
  assert.equal(pendingCareLinkReturnPath(s,now),`/invite/${token}`);
  assert.equal(readPendingCareLink(s,now+PENDING_CARE_LINK_TTL_MS),null);
  assert.equal(s.getItem(PENDING_CARE_LINK_KEY),null);
  s.setItem(PENDING_CARE_LINK_KEY,JSON.stringify({kind:"invite",token,expiresAt:now+PENDING_CARE_LINK_TTL_MS+1}));
  assert.equal(readPendingCareLink(s,now),null);
});
test("new tokens reset old identity and setup data; late callbacks cannot overwrite or clear them",()=>{
  const s=storage();
  openPendingCareLink(s,"request",token,"synthetic-user",now);
  updatePendingCareLink(s,token,{email:"synthetic@example.test",ready:true},now);
  openPendingCareLink(s,"invite",other,null,now);
  assert.equal(updatePendingCareLink(s,token,{ready:true},now),false);
  clearPendingCareLink(s,token);
  const next=readPendingCareLink(s,now);
  assert.equal(next.token,other);
  assert.equal(next.email,null);
  assert.equal(next.ready,false);
});
test("normal sign-in binds the pending link, while normal logout or unexpected account change clears it",()=>{
  const s=storage();
  openPendingCareLink(s,"request",token,null,now);
  updatePendingCareLink(s,token,{email:"synthetic@example.test"},now);
  reconcilePendingCareLink(s,null,"synthetic-user",now);
  assert.equal(readPendingCareLink(s,now).ownerId,"synthetic-user");
  assert.equal(pendingCareLinkEmail(s,"request",now),"synthetic@example.test");
  reconcilePendingCareLink(s,"synthetic-user",null,now);
  assert.equal(readPendingCareLink(s,now),null);
  openPendingCareLink(s,"invite",token,"synthetic-user",now);
  reconcilePendingCareLink(s,"synthetic-user","different-user",now);
  assert.equal(readPendingCareLink(s,now),null);
});
test("explicit account switching preserves only the token, not previous email or setup state",()=>{
  const s=storage();
  openPendingCareLink(s,"request",token,"synthetic-user",now);
  updatePendingCareLink(s,token,{email:"synthetic@example.test",ready:true,returnToRequest:true},now);
  assert.equal(preserveTokenForSwitch(s,token,now),true);
  reconcilePendingCareLink(s,"synthetic-user",null,now);
  assert.equal(readPendingCareLink(s,now).token,token);
  reconcilePendingCareLink(s,null,"different-user",now);
  const next=readPendingCareLink(s,now);
  assert.equal(next.ownerId,"different-user");
  assert.equal(next.email,null);
  assert.equal(next.ready,false);
  assert.equal(next.returnToRequest,false);
  assert.equal(next.switching,false);
});
test("corrupt or inaccessible storage fails safely without logging or accepting a link",()=>{
  const s=storage();
  s.setItem(PENDING_CARE_LINK_KEY,"{malformed");
  assert.equal(readPendingCareLink(s,now),null);
  const blocked={getItem(){throw Error("blocked")},setItem(){throw Error("blocked")},removeItem(){throw Error("blocked")}};
  assert.equal(openPendingCareLink(blocked,"invite",token,null,now),null);
  assert.equal(readPendingCareLink(blocked,now),null);
  assert.doesNotThrow(()=>clearPendingCareLink(blocked));
});
test("accepted-invite notice contains only opaque link id and expiry, expires quickly and is read once",()=>{
  const s=storage(),linkId="00000000-0000-4000-8000-000000000001";
  assert.equal(writeAcceptedInviteHandoff(s,linkId,now),true);
  assert.deepEqual(Object.keys(JSON.parse(s.getItem(ACCEPTED_INVITE_KEY))).sort(),["expiresAt","linkId"]);
  assert.equal(consumeAcceptedInviteHandoff(s,now),linkId);
  assert.equal(consumeAcceptedInviteHandoff(s,now),null);
  writeAcceptedInviteHandoff(s,linkId,now);
  assert.equal(consumeAcceptedInviteHandoff(s,now+ACCEPTED_INVITE_TTL_MS),null);
});

function privacyBootstrap(artifact,path,pending){
  const html=readFileSync(new URL(`../../../artifacts/${artifact}/index.html`,import.meta.url),"utf8");
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script,"privacy bootstrap is inline, before external scripts");
  const metas=[],s=storage();
  if(pending) s.setItem(PENDING_CARE_LINK_KEY,JSON.stringify(pending));
  const location={pathname:path,href:`https://preview.example.test${path}`};
  const document={
    readyState:"complete",
    createElement:()=>({setAttribute(name,value){this[name]=value;}}),
    head:{firstChild:null,insertBefore(meta){metas.unshift(meta);}},
    querySelectorAll:()=>metas.filter(m=>m.name==="robots"),
  };
  let guardedBeforeNavigation=false;
  const history={pushState(_state,_title,url){
    guardedBeforeNavigation=metas.some(m=>m["http-equiv"]==="Content-Security-Policy");
    location.pathname=new URL(url,location.href).pathname;
  }};
  history.replaceState=history.pushState;
  vm.runInNewContext(script.replaceAll("%VITE_CLERK_PROXY_URL%","https://preview.example.test/api/__clerk").replaceAll("%MODE%","development"),
    {sessionStorage:s,location,document,history,URL,Date:class extends Date{static now(){return now;}},atob,addEventListener(){}});
  return {metas,history,guarded:()=>guardedBeforeNavigation};
}
for(const artifact of ["website","clinicians"]){
  test(`${artifact} inline privacy guard runs before trackers, including encoded and malformed links`,()=>{
    for(const path of [`/invite/${token}`,"/REQUEST/short",`/request/${"%61".repeat(43)}`]){
      const {metas}=privacyBootstrap(artifact,path);
      const policy=metas.find(m=>m["http-equiv"]==="Content-Security-Policy")?.content;
      assert.ok(policy?.includes("connect-src 'self'"));
      assert.ok(!policy.includes("i.replit.com"));
      assert.equal(metas.find(m=>m.name==="referrer")?.content,"no-referrer");
      assert.match(metas.find(m=>m.name==="robots")?.content??"",/noindex/);
    }
    const publicPage=privacyBootstrap(artifact,"/");
    assert.equal(publicPage.metas.length,0);
    publicPage.history.pushState(null,"",`/request/${token}`);
    assert.equal(publicPage.guarded(),true,"policy applies before history observers can track the URL");
    const auth=privacyBootstrap(artifact,"/sign-in",{token,expiresAt:now+1000});
    assert.ok(auth.metas.some(m=>m.name==="referrer"));
  });
}
