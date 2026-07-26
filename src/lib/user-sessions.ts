import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { LoginContext } from "@/lib/login-geo";
import type { UserRole } from "@/lib/roles";

/** Roles that must confirm multi-device web login */
export const MULTI_DEVICE_WEB_ROLES: UserRole[] = ["super_admin", "school_admin", "clerk"];

export type SessionAction = "keep_all" | "logout_others";

export type ActiveSessionInfo = {
  id: string;
  deviceLabel: string;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  createdAt: string;
  lastSeenAt: string;
};

export function isMultiDeviceWebRole(role: string): boolean {
  return MULTI_DEVICE_WEB_ROLES.includes(role as UserRole);
}

export function newSessionKey(): string {
  return randomBytes(24).toString("hex");
}

export function deviceLabelFromUserAgent(ua: string | null | undefined): string {
  const s = ua || "";
  const browser =
    /Edg\//i.test(s)
      ? "Edge"
      : /Chrome\//i.test(s) && !/Edg\//i.test(s)
        ? "Chrome"
        : /Firefox\//i.test(s)
          ? "Firefox"
          : /Safari\//i.test(s) && !/Chrome\//i.test(s)
            ? "Safari"
            : /OPR\//i.test(s)
              ? "Opera"
              : "Browser";

  const os =
    /Windows/i.test(s)
      ? "Windows"
      : /Android/i.test(s)
        ? "Android"
        : /iPhone|iPad|iOS/i.test(s)
          ? "iOS"
          : /Mac OS/i.test(s)
            ? "macOS"
            : /Linux/i.test(s)
              ? "Linux"
              : "Device";

  return `${browser} on ${os}`;
}

export async function listActiveWebSessions(userId: string): Promise<ActiveSessionInfo[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Soft-expire stale rows so closed browsers don't block forever
  await prisma.userSession.updateMany({
    where: { userId, channel: "web", revokedAt: null, lastSeenAt: { lt: cutoff } },
    data: { revokedAt: new Date(), revokeReason: "expired" },
  });

  const rows = await prisma.userSession.findMany({
    where: { userId, channel: "web", revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
  });
  return rows.map((r) => ({
    id: r.id,
    deviceLabel: r.deviceLabel || "Web browser",
    ip: r.ip,
    city: r.city,
    region: r.region,
    country: r.country,
    createdAt: r.createdAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
  }));
}

export async function revokeOtherWebSessions(userId: string, keepSessionKey?: string | null) {
  await prisma.userSession.updateMany({
    where: {
      userId,
      channel: "web",
      revokedAt: null,
      ...(keepSessionKey ? { sessionKey: { not: keepSessionKey } } : {}),
    },
    data: {
      revokedAt: new Date(),
      revokeReason: "logout_others",
    },
  });
}

export async function revokeSessionByKey(sessionKey: string, reason = "logout") {
  await prisma.userSession.updateMany({
    where: { sessionKey, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
}

export async function createUserSession(opts: {
  userId: string;
  sessionKey: string;
  channel: "web" | "mobile";
  ctx: LoginContext;
}) {
  const deviceLabel = deviceLabelFromUserAgent(opts.ctx.userAgent);
  return prisma.userSession.create({
    data: {
      userId: opts.userId,
      sessionKey: opts.sessionKey,
      channel: opts.channel,
      deviceLabel,
      userAgent: opts.ctx.userAgent,
      ip: opts.ctx.ip,
      city: opts.ctx.city,
      region: opts.ctx.region,
      country: opts.ctx.country,
    },
  });
}

export async function isSessionActive(sessionKey: string | null | undefined): Promise<boolean> {
  if (!sessionKey) return true; // legacy tokens without sid remain valid until re-login
  const row = await prisma.userSession.findUnique({
    where: { sessionKey },
    select: { revokedAt: true },
  });
  if (!row) return false;
  return row.revokedAt == null;
}

export async function touchSession(sessionKey: string | null | undefined) {
  if (!sessionKey) return;
  try {
    await prisma.userSession.updateMany({
      where: { sessionKey, revokedAt: null },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    /* ignore */
  }
}

/** Stable fingerprint for soft matching same browser (optional UX). */
export function softDeviceFingerprint(ua: string | null, ip: string): string {
  return createHash("sha256")
    .update(`${ua || ""}|${ip}`)
    .digest("hex")
    .slice(0, 16);
}
