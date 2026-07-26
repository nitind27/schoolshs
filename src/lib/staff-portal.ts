import { randomBytes } from "crypto";
import type { UserRole } from "@/lib/roles";

const STAFF_PORTAL_ROLES: UserRole[] = ["teacher", "clerk"];

/** Designations that get a portal login on staff create */
export function shouldCreatePortalLogin(designation: string): boolean {
  const d = designation.toLowerCase().trim();
  if (!d) return false;
  return (
    d.includes("teacher") ||
    d.includes("principal") ||
    d.includes("clerk") ||
    d.includes("accountant") ||
    d === "hm" ||
    d.includes("head master") ||
    d.includes("headmistress")
  );
}

export function pickStaffPortalRole(designation?: string | null): UserRole {
  const d = (designation || "").toLowerCase();
  if (d.includes("clerk") || d.includes("accountant")) return "clerk";
  return "teacher";
}

export function isStaffPortalRole(role: unknown): role is UserRole {
  return STAFF_PORTAL_ROLES.includes(String(role || "").trim() as UserRole);
}

export function resolveStaffPortalRole(role: unknown, designation?: string | null): UserRole {
  if (isStaffPortalRole(role)) return String(role).trim() as UserRole;
  return pickStaffPortalRole(designation);
}

/** Cryptographically random 8-digit numeric password (may include leading zeros). */
export function generateStaffNumericPassword(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += String(bytes[i]! % 10);
  }
  // Ensure not all zeros and keep exact length
  if (/^0+$/.test(out)) out = `1${out.slice(1)}`;
  return out;
}
