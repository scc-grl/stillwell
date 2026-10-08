export function requestLogPath(url: string | undefined): string | undefined {
  const path = url?.split("?")[0];
  if (path?.startsWith("/api/recovery/logs/")) return "/api/recovery/logs/:date";
  if (path?.startsWith("/api/__clerk/")) return "/api/__clerk/:resource";
  return path;
}
