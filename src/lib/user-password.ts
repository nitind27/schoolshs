import { randomBytes } from "crypto";
import { hashPassword } from "@/lib/auth";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

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
