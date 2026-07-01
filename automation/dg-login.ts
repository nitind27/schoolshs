import type { Page } from "playwright";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { DgPortalConfig } from "../src/lib/dg-portal";
import { DG_LOGIN_SELECTORS, SJED_LOGIN_SELECTORS } from "./selectors";
import {
  getDgProfileDir,
  isDgSessionActive,
  readSessionMeta,
  writeSessionMeta,
  type SessionMeta,
} from "./session";
import { goToPortalEntry, navigateDg, needsLogin } from "./dg-nav";
import { waitForContinueConfirm, type LogFn } from "./form-filler";
import { waitForLoginWithOtpAutoFill } from "./otp-handler";
import type { JobReporter } from "./status-reporter";

export interface DgCredentials {
  loginId: string;
  password: string;
  loginMethod: "mobile" | "email";
  source: "school" | "student";
}

export async function resolveDgCredentials(
  prisma: PrismaClient,
  schoolId: string | null | undefined,
  student: Record<string, unknown>,
  portal: DgPortalConfig
): Promise<DgCredentials> {
  if (schoolId) {
    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });
    if (portal.type === "sjed" && settings?.dgSjedUsername?.trim()) {
      return {
        loginId: settings.dgSjedUsername.trim(),
        password: settings.dgSjedPassword || "",
        loginMethod: "mobile",
        source: "school",
      };
    }
    if (portal.type === "citizen" && settings?.dgCitizenLoginId?.trim()) {
      return {
        loginId: settings.dgCitizenLoginId.trim(),
        password: settings.dgCitizenPassword || "",
        loginMethod: (settings.dgCitizenLoginMethod as "mobile" | "email") || "mobile",
        source: "school",
      };
    }
  }

  return {
    loginId: String(student.dgLoginId || student.mobileNumber || student.email || ""),
    password: String(student.dgPassword || ""),
    loginMethod: (String(student.dgLoginMethod || "mobile") as "mobile" | "email") || "mobile",
    source: "student",
  };
}

async function clickFirstVisible(page: Page, selectors: string[]): Promise<boolean> {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 2000 })) {
        await loc.click();
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

async function fillFirstVisible(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 2000 })) {
        await loc.fill(value);
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

export async function probeDgSession(
  page: Page,
  portal: DgPortalConfig,
  log: LogFn,
  profileDir: string
): Promise<"active" | "login_required"> {
  await goToPortalEntry(page, portal, log, profileDir);
  return isDgSessionActive(page.url(), portal.loginPagePattern) ? "active" : "login_required";
}

export function getProfileDirForSchool(
  portal: DgPortalConfig,
  schoolId: string | null | undefined,
  fallbackLoginId: string
): string {
  const scopeKey = schoolId ? `school-${schoolId}` : fallbackLoginId;
  return getDgProfileDir(portal.type, scopeKey);
}

export async function ensureDgLoggedIn(
  page: Page,
  prisma: PrismaClient,
  schoolId: string | null | undefined,
  student: Record<string, unknown>,
  log: LogFn,
  profileDir: string,
  portal: DgPortalConfig,
  jobId = "",
  reporter: JobReporter | null = null
): Promise<void> {
  const creds = await resolveDgCredentials(prisma, schoolId, student, portal);

  if (!creds.loginId) {
    throw new Error(
      portal.type === "sjed"
        ? "SJED User ID missing — Auto Apply page par school login save karein"
        : "Citizen login ID missing — Auto Apply page par save karein"
    );
  }

  const meta = readSessionMeta(profileDir);
  log(`Portal: ${portal.labelHi} (${portal.loginUrl.split("/").pop()})`);

  const sessionState = await probeDgSession(page, portal, log, profileDir);

  if (sessionState === "active") {
    log(`✓ ${portal.label} session active — OTP skip, seedha dashboard`);
    const postLoginUrl = page.url();
    writeSessionMeta(profileDir, {
      loginId: creds.loginId,
      portalType: portal.type,
      lastLoginAt: meta?.lastLoginAt || new Date().toISOString(),
      postLoginUrl,
      source: creds.source,
    });
    return;
  }

  log(`Login required → ${portal.loginUrl.split("/").pop()}`);
  if (creds.source === "school") {
    log(`School login: ${creds.loginId.substring(0, 3)}*** (${portal.type.toUpperCase()})`);
  }

  await navigateDg(page, portal.loginUrl, log, portal);
  await page.waitForTimeout(1000);

  if (isDgSessionActive(page.url(), portal.loginPagePattern)) {
    log("✓ Already logged in after redirect");
    writeSessionMeta(profileDir, buildSessionMeta(creds, portal.type, page.url()));
    return;
  }

  if (portal.type === "citizen") {
    await clickFirstVisible(
      page,
      creds.loginMethod === "email" ? DG_LOGIN_SELECTORS.emailRadio : DG_LOGIN_SELECTORS.mobileRadio
    );
    await fillFirstVisible(page, DG_LOGIN_SELECTORS.username, creds.loginId);
    if (creds.password) await fillFirstVisible(page, DG_LOGIN_SELECTORS.password, creds.password);
  } else {
    await fillFirstVisible(page, SJED_LOGIN_SELECTORS.username, creds.loginId);
    if (creds.password) await fillFirstVisible(page, SJED_LOGIN_SELECTORS.password, creds.password);
  }

  await waitForLoginWithOtpAutoFill(page, portal, prisma, jobId, schoolId || "", log, reporter);

  await waitForContinueConfirm(
    page,
    `✓ ${portal.label} login ho gaya! Ab Continue dabayein — automation shuru hogi`,
    log,
    `${portal.label} — Ready`
  );

  writeSessionMeta(profileDir, buildSessionMeta(creds, portal.type, page.url()));
  log(`✓ Login complete — agli baar seedha yahi page khulega (${page.url().split("/").pop()})`);
}

function buildSessionMeta(
  creds: DgCredentials,
  portalType: "sjed" | "citizen",
  postLoginUrl: string
): SessionMeta {
  return {
    loginId: creds.loginId,
    portalType,
    lastLoginAt: new Date().toISOString(),
    postLoginUrl,
    source: creds.source,
  };
}

export async function revalidateSessionIfNeeded(
  page: Page,
  prisma: PrismaClient,
  schoolId: string | null | undefined,
  student: Record<string, unknown>,
  log: LogFn,
  profileDir: string,
  portal: DgPortalConfig,
  jobId = "",
  reporter: JobReporter | null = null
): Promise<void> {
  if (!needsLogin(page, portal)) return;
  log(`⚠ ${portal.label} session expired — re-login...`);
  await ensureDgLoggedIn(page, prisma, schoolId, student, log, profileDir, portal, jobId, reporter);
}
