import { randomBytes } from "crypto";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

export type PasswordChangeSource =
  | "self_change"
  | "admin_reset"
  | "staff_portal"
  | "school_register"
  | "staff_create"
  | "other";

export function passwordRecord(plain: string) {
  return {
    passwordHash: hashPassword(plain),
    passwordEnc: encryptSecret(plain),
    passwordChangedAt: new Date(),
  };
}

export function decryptUserPassword(enc: string | null | undefined): string | null {
  const v = decryptSecret(enc);
  return v?.trim() ? v : null;
}

/** Printable portal password for credential dossiers. */
export function generatePortalPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  let body = "";
  for (const b of bytes) body += chars[b % chars.length];
  return `Ca@${body}`;
}

export async function recordPasswordChange(input: {
  userId: string;
  email: string;
  name: string;
  role: string;
  schoolId?: string | null;
  password: string;
  source: PasswordChangeSource;
  actorUserId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
}) {
  const passwordEnc = encryptSecret(input.password);
  try {
    await prisma.passwordChangeEvent.create({
      data: {
        userId: input.userId,
        email: input.email,
        name: input.name,
        role: input.role,
        schoolId: input.schoolId ?? null,
        source: input.source,
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        actorName: input.actorName ?? null,
        passwordEnc,
      },
    });
  } catch (e) {
    console.error("[password-change-event]", e);
  }
}
