import path from "path";
import fs from "fs";
import crypto from "crypto";

export interface SessionMeta {
  loginId: string;
  portalType: "citizen" | "sjed";
  lastLoginAt: string;
  /** OTP ke baad jahan redirect hua — agli baar seedha yahan */
  postLoginUrl?: string;
  source?: "school" | "student";
}

const META_FILE = ".dg-session.json";

/** Profile path only — safe on Vercel (no mkdir) */
export function resolveDgProfileDir(portalType: "citizen" | "sjed", scopeKey: string): string {
  const safe = crypto
    .createHash("sha256")
    .update(`${portalType}:${scopeKey.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 16);
  return path.join(process.cwd(), "automation", "profiles", `${portalType}-${safe}`);
}

/** Browser profile dir — local automation; mkdir skipped on Vercel (read-only FS) */
export function getDgProfileDir(portalType: "citizen" | "sjed", scopeKey: string): string {
  const dir = resolveDgProfileDir(portalType, scopeKey);
  if (process.env.VERCEL !== "1") {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      /* ignore */
    }
  }
  return dir;
}

export function getSessionMetaPath(profileDir: string): string {
  return path.join(profileDir, META_FILE);
}

export function readSessionMeta(profileDir: string): SessionMeta | null {
  try {
    const raw = fs.readFileSync(getSessionMetaPath(profileDir), "utf-8");
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
}

export function writeSessionMeta(profileDir: string, meta: SessionMeta): void {
  fs.writeFileSync(getSessionMetaPath(profileDir), JSON.stringify(meta, null, 2), "utf-8");
}

export function isLoginUrl(url: string, loginPagePattern: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("citizenportal") && !lower.includes("login")) return false;
  return (
    lower.includes(loginPagePattern.toLowerCase()) ||
    lower.includes("citizenlogin.aspx") ||
    lower.includes("sjedlogin.aspx") ||
    (lower.includes("/loginapp/") && lower.includes("login"))
  );
}

export function isDgErrorUrl(url: string): boolean {
  return url.toLowerCase().includes("errorpage.aspx");
}

function isDgPortalHost(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("digitalgujarat.gov.in");
  } catch {
    return false;
  }
}

/** Fresh browser / empty tab — active session mat samjho */
export function isBlankOrInvalidUrl(url: string): boolean {
  const lower = url.toLowerCase().trim();
  if (!lower || lower === "about:blank") return true;
  if (lower.startsWith("about:") || lower.startsWith("chrome:") || lower.startsWith("data:")) return true;
  return !isDgPortalHost(url);
}

/** HomePage.aspx bina session ke ErrorPage pe bhej deta hai — active mat samjho */
export function isDgSessionActive(url: string, loginPagePattern: string): boolean {
  if (isBlankOrInvalidUrl(url)) return false;
  const lower = url.toLowerCase();
  if (isDgErrorUrl(url)) return false;
  if (isLoginUrl(url, loginPagePattern)) return false;
  if (lower.includes("homepage.aspx")) return false;
  return isDgPortalHost(url);
}

export function profileHasBrowserData(profileDir: string): boolean {
  try {
    return fs.readdirSync(profileDir).some((f) => f !== ".dg-session.json");
  } catch {
    return false;
  }
}
