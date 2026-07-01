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
