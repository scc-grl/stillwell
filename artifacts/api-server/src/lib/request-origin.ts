type RequestOrigin = { origin?: string; host?: string; authorization?: string };

// Cookie requests remain same-origin. The separate development Expo preview
// uses explicit Clerk bearer tokens; admit only this workspace's trusted host.
export function allowedRequestOrigin(
  request: RequestOrigin,
  developmentExpoHost = process.env.NODE_ENV === "development" ? process.env.REPLIT_EXPO_DEV_DOMAIN : undefined,
) {
  if (!request.origin) return true;
  try {
    const origin = new URL(request.origin);
    if (origin.host === request.host) return true;
    return Boolean(developmentExpoHost && origin.protocol === "https:" &&
      origin.host === developmentExpoHost && /^Bearer \S+$/i.test(request.authorization ?? ""));
  } catch { return false; }
}
