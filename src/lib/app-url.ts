const configuredAppUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "");

export function getAppUrl() {
  if (typeof window === "undefined") return configuredAppUrl ?? "";

  const { origin, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;

  return configuredAppUrl ?? origin;
}

export function getAuthRedirectUrl(path: `/${string}`) {
  return `${getAppUrl()}${path}`;
}
