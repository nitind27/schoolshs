/** Edge-safe — no Node.js path/fs (used by middleware) */

function read(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
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
 * Public base URL for phone QR / OTP bridge.
 * Local: set LAN_HOST=192.168.1.5 (same WiFi) or APP_URL=http://192.168.1.5:3000
 * Vercel: uses request origin unless APP_URL is set
 */
export function getPublicAppOrigin(fallbackOrigin: string): string {
  const explicit = getAppUrl();
  if (explicit) return explicit.replace(/\/$/, "");

  const lanHost = read("LAN_HOST");
  if (lanHost) {
    const bare = lanHost.replace(/^https?:\/\//, "").split("/")[0]!;
    if (bare.includes(":")) {
      return bare.startsWith("http") ? bare : `http://${bare}`;
    }
    const port = read("LAN_PORT") || read("PORT") || "3000";
    return `http://${bare}:${port}`;
  }

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
