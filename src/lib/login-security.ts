import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/auth";

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;
/** Separate IP-wide ceiling so password spraying many emails is still limited */
export const MAX_IP_ATTEMPTS = 40;

export class AccountLockedError extends AuthError {
  constructor(
    message: string,
    public lockedUntil: Date,
    public retryAfterSeconds: number,
  ) {
    super(message, 423);
  }
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function getClientIp(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") || "unknown";
}

type AttemptRec = { count: number; lockedUntil: number };

/** Per IP+email — wrong CA login must not block teacher/admin with correct credentials */
const identityAttempts = new Map<string, AttemptRec>();
/** Soft global IP throttle against mass username spraying */
const ipSprayAttempts = new Map<string, AttemptRec>();

function attemptKey(ip: string, email: string): string {
  return `${ip}::${normalizeEmail(email) || "_"}`;
}

function throwIfLocked(rec: AttemptRec | undefined, message: string) {
  if (!rec) return;
  if (rec.lockedUntil > Date.now()) {
    const retryAfterSeconds = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
    throw new AccountLockedError(
      message.replace(
        "{{mins}}",
        String(Math.max(1, Math.ceil(retryAfterSeconds / 60))),
      ),
      new Date(rec.lockedUntil),
      retryAfterSeconds,
    );
  }
}

function bumpAttempt(map: Map<string, AttemptRec>, key: string, maxAttempts: number) {
  const rec = map.get(key) || { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil > Date.now()) return rec;
  if (rec.lockedUntil > 0 && rec.lockedUntil <= Date.now()) {
    rec.count = 0;
    rec.lockedUntil = 0;
  }
  rec.count += 1;
  if (rec.count >= maxAttempts) {
    rec.lockedUntil = Date.now() + LOCK_DURATION_MS;
    rec.count = 0;
  }
  map.set(key, rec);
  return rec;
}

export async function assertAccountNotLocked(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { lockedUntil: true },
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    throw new AccountLockedError(
      `Account locked. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      user.lockedUntil,
      retryAfterSeconds,
    );
  }
}

export async function recordLoginFailure(email: string, ip: string) {
  const normalized = normalizeEmail(email);
  const idKey = attemptKey(ip, normalized);
  const idRec = bumpAttempt(identityAttempts, idKey, MAX_LOGIN_ATTEMPTS);
  bumpAttempt(ipSprayAttempts, ip, MAX_IP_ATTEMPTS);

  if (!normalized) {
    return {
      attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - (idRec.count || 0)),
      lockedUntil: idRec.lockedUntil > Date.now() ? new Date(idRec.lockedUntil) : null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, failedLoginCount: true },
  });

  if (!user) {
    const lockedUntil = idRec.lockedUntil > Date.now() ? new Date(idRec.lockedUntil) : null;
    return {
      attemptsLeft: lockedUntil
        ? 0
        : Math.max(0, MAX_LOGIN_ATTEMPTS - (idRec.count || 0)),
      lockedUntil,
    };
  }

  const nextCount = user.failedLoginCount + 1;
  const lockedUntil =
    nextCount >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: lockedUntil ? 0 : nextCount,
      lockedUntil,
    },
  });

  return {
    attemptsLeft: lockedUntil ? 0 : Math.max(0, MAX_LOGIN_ATTEMPTS - nextCount),
    lockedUntil,
  };
}

export async function clearLoginFailures(email: string, ip: string) {
  identityAttempts.delete(attemptKey(ip, email));
  // Successful login for any account clears the soft IP spray counter for this IP
  ipSprayAttempts.delete(ip);

  const normalized = normalizeEmail(email);
  if (!normalized) return;

  await prisma.user.updateMany({
    where: { email: normalized },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}

/** Check locks for this IP + email only (other accounts on same IP stay usable). */
export function checkIpBeforeLogin(ip: string, email?: string) {
  throwIfLocked(
    ipSprayAttempts.get(ip),
    "Too many attempts from this network. Try again in {{mins}} minutes.",
  );
  if (email !== undefined) {
    throwIfLocked(
      identityAttempts.get(attemptKey(ip, email)),
      "Too many attempts. Try again in {{mins}} minutes.",
    );
  }
}

export function loginErrorPayload(error: AuthError) {
  if (error instanceof AccountLockedError) {
    return {
      error: error.message,
      locked: true,
      lockedUntil: error.lockedUntil.toISOString(),
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  return { error: error.message };
}
