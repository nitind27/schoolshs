export type UserRole = "super_admin" | "school_admin";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
  schoolName?: string | null;
  schoolCode?: string | null;
}

const SECRET = process.env.AUTH_SECRET || "shs-dev-secret-change-in-production-2026";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

function base64urlToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

let hmacKey: CryptoKey | null = null;

async function getHmacKey(): Promise<CryptoKey> {
  if (!hmacKey) {
    hmacKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return hmacKey;
}

async function signPayload(payload: string): Promise<string> {
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

async function verifyPayload(payload: string, sig: string): Promise<boolean> {
  try {
    const key = await getHmacKey();
    const sigBytes = new Uint8Array(base64urlToBytes(sig));
    return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))
  );
  return `${payload}.${await signPayload(payload)}`;
}

export async function parseSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    if (!(await verifyPayload(payload, sig))) return null;

    const data = JSON.parse(fromBase64Url(payload));
    if (data.exp && data.exp < Date.now()) return null;

    return {
      userId: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
      schoolId: data.schoolId ?? null,
      schoolName: data.schoolName ?? null,
      schoolCode: data.schoolCode ?? null,
    };
  } catch {
    return null;
  }
}
