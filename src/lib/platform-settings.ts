import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/secret-crypto";

export const PLATFORM_SETTINGS_ID = "platform";

export type SmtpConfig = {
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpReplyTo: string | null;
};

export type SmtpSettingsPublic = {
  emailEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  smtpReplyTo: string | null;
  hasPassword: boolean;
  passwordMasked: string;
  smtpLastTestAt: string | null;
  smtpLastTestOk: boolean | null;
  smtpLastTestError: string | null;
};

export async function ensurePlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: { id: PLATFORM_SETTINGS_ID },
    update: {},
  });
}

export async function getPlatformSettings() {
  return ensurePlatformSettings();
}

export async function isEmailEnabled(): Promise<boolean> {
  const row = await getPlatformSettings();
  return Boolean(row.emailEnabled && row.smtpHost && row.smtpFromEmail && row.smtpPasswordEnc);
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const row = await getPlatformSettings();
  if (!row.emailEnabled || !row.smtpHost || !row.smtpFromEmail) return null;

  const password = decryptSecret(row.smtpPasswordEnc);
  if (!password) return null;

  return {
    emailEnabled: true,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort || 587,
    smtpSecure: row.smtpSecure,
    smtpUser: row.smtpUser || row.smtpFromEmail,
    smtpPassword: password,
    smtpFromName: row.smtpFromName || "SHS Education Portal",
    smtpFromEmail: row.smtpFromEmail,
    smtpReplyTo: row.smtpReplyTo,
  };
}

export function toPublicSmtpSettings(
  row: Awaited<ReturnType<typeof getPlatformSettings>>,
): SmtpSettingsPublic {
  const password = decryptSecret(row.smtpPasswordEnc);
  return {
    emailEnabled: row.emailEnabled,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpSecure: row.smtpSecure,
    smtpUser: row.smtpUser,
    smtpFromName: row.smtpFromName,
    smtpFromEmail: row.smtpFromEmail,
    smtpReplyTo: row.smtpReplyTo,
    hasPassword: Boolean(row.smtpPasswordEnc),
    passwordMasked: password ? `••••••••${password.slice(-4)}` : "",
    smtpLastTestAt: row.smtpLastTestAt?.toISOString() ?? null,
    smtpLastTestOk: row.smtpLastTestOk,
    smtpLastTestError: row.smtpLastTestError,
  };
}
