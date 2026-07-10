/** Edge-safe — no Node.js path/fs (used by middleware) */

function read(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

function isLocalHostname(host: string): boolean {
  const h = host.split(":")[0]!.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    h.endsWith(".local")
  );
}

function isLocalOrigin(url: string): boolean {
  try {
    const u = new URL(url.includes("://") ? url : `http://${url}`);
    return isLocalHostname(u.hostname);
  } catch {
    return true;
  }
}

function originFromHost(host: string, proto = "https"): string {
  const bare = host.replace(/^https?:\/\//, "").split("/")[0]!.trim();
  if (!bare) return "";
  if (bare.includes("://")) return bare.replace(/\/$/, "");
  return `${proto}://${bare}`.replace(/\/$/, "");
}

export function getAuthSecret(): string {
  const secret = read("AUTH_SECRET");
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production — set it in Vercel Environment Variables");
  }
  return "shs-dev-secret-change-in-production-2026";
}

export function getAppUrl(): string | undefined {
  return read("APP_URL") || read("NEXT_PUBLIC_APP_URL");
}

/**
 * Best public origin from an incoming HTTP request (nginx / reverse proxy aware).
 * Prefers real domain from X-Forwarded-Host over localhost APP_URL.
 */
export function getRequestPublicOrigin(request: {
  nextUrl: { origin: string };
  headers: { get(name: string): string | null };
}): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const hostHeader = request.headers.get("host")?.split(",")[0]?.trim();

  const candidates: string[] = [];

  if (forwardedHost && !isLocalHostname(forwardedHost)) {
    candidates.push(originFromHost(forwardedHost, forwardedProto));
  }
  if (hostHeader && !isLocalHostname(hostHeader)) {
    candidates.push(originFromHost(hostHeader, forwardedProto));
  }

  const explicit = getAppUrl();
  if (explicit && !isLocalOrigin(explicit)) {
    candidates.push(explicit.replace(/\/$/, ""));
  }

  const fallback = request.nextUrl.origin.replace(/\/$/, "");
  if (!isLocalOrigin(fallback)) {
    candidates.push(fallback);
  }

  if (candidates.length > 0) return candidates[0]!;

  if (explicit) return explicit.replace(/\/$/, "");

  const lanHost = read("LAN_HOST");
  if (lanHost) {
    const bare = lanHost.replace(/^https?:\/\//, "").split("/")[0]!;
    if (bare.includes(":")) {
      return bare.startsWith("http") ? bare.replace(/\/$/, "") : `http://${bare}`;
    }
    const port = read("LAN_PORT") || read("PORT") || "3000";
    return `http://${bare}:${port}`;
  }

  return fallback;
}

/**
 * Public base URL for phone QR / OTP bridge.
 * Local: set LAN_HOST=192.168.1.5 (same WiFi) or APP_URL=http://192.168.1.5:3000
 */
export function getPublicAppOrigin(fallbackOrigin: string): string {
  const explicit = getAppUrl();
  if (explicit && !isLocalOrigin(explicit)) return explicit.replace(/\/$/, "");

  if (!isLocalOrigin(fallbackOrigin)) return fallbackOrigin.replace(/\/$/, "");

  const lanHost = read("LAN_HOST");
  if (lanHost) {
    const bare = lanHost.replace(/^https?:\/\//, "").split("/")[0]!;
    if (bare.includes(":")) {
      return bare.startsWith("http") ? bare.replace(/\/$/, "") : `http://${bare}`;
    }
    const port = read("LAN_PORT") || read("PORT") || "3000";
    return `http://${bare}:${port}`;
  }

  if (explicit) return explicit.replace(/\/$/, "");
  return fallbackOrigin.replace(/\/$/, "");
}

export function buildPhoneBridgeUrl(requestOrigin: string, token: string): string {
  const base = getPublicAppOrigin(requestOrigin);
  return `${base}/m/sms-bridge?token=${encodeURIComponent(token)}`;
}

export function buildSmsWebhookUrl(requestOrigin: string, token: string): string {
  const base = getPublicAppOrigin(requestOrigin);
  return `${base}/api/automation/sms/webhook?token=${encodeURIComponent(token)}`;
}

/** SMS Forwarder app ke liye template URL ({{msg}} = poora SMS) */
export function buildSmsForwarderWebhookUrl(requestOrigin: string, token: string): string {
  const base = buildSmsWebhookUrl(requestOrigin, token);
  return `${base}&text={{msg}}&from={{from}}`;
}

export function buildForwarderSetupUrl(requestOrigin: string, token: string): string {
  const base = getPublicAppOrigin(requestOrigin);
  return `${base}/m/forwarder-setup?token=${encodeURIComponent(token)}`;
}
