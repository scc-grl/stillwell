export function requestLogPath(url: string | undefined): string | undefined {
  const path = url?.split("?")[0];
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
