export function requestLogPath(url: string | undefined): string | undefined {
  const path = url?.split("?")[0];
  const lowerPath = path?.toLowerCase();
  if (/^\/(?:api\/)?invite\/[^/]+(?:\/.*)?$/i.test(path ?? "")) return lowerPath?.startsWith("/api/") ? "/api/invite/:token" : "/invite/:token";
  if (/^\/(?:api\/)?request\/[^/]+(?:\/.*)?$/i.test(path ?? "")) return lowerPath?.startsWith("/api/") ? "/api/request/:token" : "/request/:token";
  if (/^\/api\/(?:(?:patient|clinician)\/)?care-team(?:\/|$)/i.test(path ?? "")) {
    return path?.replace(/(\/requests\/|\/invites\/|\/patients\/|\/links\/)[^/]+/gi, "$1:redacted");
  }
  if (lowerPath?.startsWith("/api/recovery/logs/")) return "/api/recovery/logs/:date";
  if (lowerPath?.startsWith("/api/patient/clinician-connections/")) return "/api/patient/clinician-connections/:id";
  if (/^\/api\/clinician\/invitations\/[^/]+\/accept$/i.test(path ?? "")) {
    return "/api/clinician/invitations/:id/accept";
  }
  if (/^\/api\/clinician\/patients\/[^/]+$/i.test(path ?? "")) {
    return "/api/clinician/patients/:connectionId";
  }
  if (lowerPath?.startsWith("/api/__clerk/")) return "/api/__clerk/:resource";
  return path;
}
