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
  passwordDecryptOk: boolean;
  passwordMasked: string;
  configReady: boolean;
  configIssue: string | null;
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
  return (await getSmtpConfig()) !== null;
}

/** Why SMTP is not ready — for admin UI / OTP errors */
export async function getSmtpConfigIssue(
  row?: Awaited<ReturnType<typeof getPlatformSettings>>,
): Promise<string | null> {
  const settings = row || (await getPlatformSettings());
  if (!settings.emailEnabled) {
    return "Email is disabled. Enable it in Admin → Email Settings and Save.";
  }
  if (!settings.smtpHost?.trim()) return "SMTP host is missing.";
  if (!settings.smtpFromEmail?.trim() && !settings.smtpUser?.trim()) {
    return "From email / SMTP username is missing. Enter Gmail address and Save.";
  }
  if (!settings.smtpFromEmail?.trim()) {
    return "From email is missing. Enter sender email and Save.";
  }
  if (!settings.smtpPasswordEnc?.trim()) {
    return "SMTP app password is not saved. Enter the 16-character App Password and click Save.";
  }
  const password = decryptSecret(settings.smtpPasswordEnc);
  if (!password) {
    return "Saved SMTP password cannot be decrypted. Re-enter App Password and Save (keep AUTH_SECRET unchanged).";
  }
  return null;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const row = await getPlatformSettings();
  if (!row.emailEnabled) return null;

  const fromEmail = (row.smtpFromEmail || row.smtpUser || "").trim().toLowerCase();
  const host = (row.smtpHost || "").trim();
  if (!host || !fromEmail) return null;

  const password = decryptSecret(row.smtpPasswordEnc);
  if (!password) return null;

  return {
    emailEnabled: true,
    smtpHost: host,
    smtpPort: row.smtpPort || 587,
    smtpSecure: row.smtpSecure,
    smtpUser: (row.smtpUser || fromEmail).trim(),
    smtpPassword: password,
    smtpFromName: row.smtpFromName || "Codeat Education",
    smtpFromEmail: fromEmail,
    smtpReplyTo: row.smtpReplyTo,
  };
}

export function toPublicSmtpSettings(
  row: Awaited<ReturnType<typeof getPlatformSettings>>,
): SmtpSettingsPublic {
  const password = decryptSecret(row.smtpPasswordEnc);
  const hasPassword = Boolean(row.smtpPasswordEnc);
  const passwordDecryptOk = Boolean(password);
  const fromEmail = row.smtpFromEmail || row.smtpUser;
  const configReady =
    row.emailEnabled &&
    Boolean(row.smtpHost?.trim()) &&
    Boolean(fromEmail?.trim()) &&
    passwordDecryptOk;

  let configIssue: string | null = null;
  if (!row.emailEnabled) configIssue = "Email sending is disabled.";
  else if (!row.smtpHost?.trim()) configIssue = "SMTP host missing.";
  else if (!fromEmail?.trim()) configIssue = "From email missing.";
  else if (!hasPassword) configIssue = "App password not saved.";
  else if (!passwordDecryptOk) configIssue = "Saved password cannot be decrypted — re-enter and Save.";

  return {
    emailEnabled: row.emailEnabled,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpSecure: row.smtpSecure,
    smtpUser: row.smtpUser,
    smtpFromName: row.smtpFromName,
    smtpFromEmail: row.smtpFromEmail,
    smtpReplyTo: row.smtpReplyTo,
    hasPassword,
    passwordDecryptOk,
    passwordMasked: password ? `••••••••${password.slice(-4)}` : hasPassword ? "••••••••(locked)" : "",
    configReady,
    configIssue,
    smtpLastTestAt: row.smtpLastTestAt?.toISOString() ?? null,
    smtpLastTestOk: row.smtpLastTestOk,
    smtpLastTestError: row.smtpLastTestError,
  };
}
