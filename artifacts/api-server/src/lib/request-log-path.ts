export function requestLogPath(url: string | undefined): string | undefined {
  const path = url?.split("?")[0];
  if (/^\/(?:api\/)?invite\/[^/]+(?:\/.*)?$/.test(path ?? "")) return path?.startsWith("/api/") ? "/api/invite/:token" : "/invite/:token";
  if (/^\/(?:api\/)?request\/[^/]+(?:\/.*)?$/.test(path ?? "")) return path?.startsWith("/api/") ? "/api/request/:token" : "/request/:token";
  if (/^\/api\/(?:patient|clinician)\/care-team(?:\/|$)/.test(path ?? "")) {
    return path?.replace(/(\/requests\/|\/invites\/|\/patients\/|\/links\/)[^/]+/, "$1:redacted");
  }
  if (path?.startsWith("/api/recovery/logs/")) return "/api/recovery/logs/:date";
  if (path?.startsWith("/api/patient/clinician-connections/")) return "/api/patient/clinician-connections/:id";
  if (/^\/api\/clinician\/invitations\/[^/]+\/accept$/.test(path ?? "")) {
    return "/api/clinician/invitations/:id/accept";
  }
  if (/^\/api\/clinician\/patients\/[^/]+$/.test(path ?? "")) {
    return "/api/clinician/patients/:connectionId";
  }
  if (path?.startsWith("/api/__clerk/")) return "/api/__clerk/:resource";
  return path;
}
