import type { Page } from "playwright";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { DgPortalConfig } from "../src/lib/dg-portal";
import {
  getDgProfileDir,
  isDgSessionActive,
  readSessionMeta,
  writeSessionMeta,
  type SessionMeta,
} from "./session";
import { goToPortalEntry, navigateDg, needsLogin } from "./dg-nav";
import { waitForContinueConfirm, waitForPortalLogin, type LogFn } from "./form-filler";
import { isAutomationHeadless } from "./headless";
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

  log(`Portal: ${portal.labelHi} (${portal.loginUrl.split("/").pop()})`);

  // Pehle seedha Digital Gujarat login URL kholo
  log(`Opening Digital Gujarat → ${portal.loginUrl}`);
  if (reporter) {
    await reporter.flush({ currentStep: "Digital Gujarat portal khul raha hai..." });
  }
  await navigateDg(page, portal.loginUrl, log, portal);
  await page.bringToFront().catch(() => {});

  if (!creds.loginId) {
    log("⚠ Login ID save nahi — browser me manually login karein");
  } else if (creds.source === "school") {
    log(`School login: ${creds.loginId.substring(0, 3)}*** (${portal.type.toUpperCase()})`);
  }

  if (isDgSessionActive(page.url(), portal.loginPagePattern)) {
    log(`✓ ${portal.label} session active — seedha dashboard`);
    const postLoginUrl = page.url();
    const meta = readSessionMeta(profileDir);
    writeSessionMeta(profileDir, {
      loginId: creds.loginId || meta?.loginId || "",
      portalType: portal.type,
      lastLoginAt: meta?.lastLoginAt || new Date().toISOString(),
      postLoginUrl,
      source: creds.source,
    });
    return;
  }

  const sessionState = await probeDgSession(page, portal, log, profileDir);

  if (sessionState === "active") {
    log(`✓ ${portal.label} session active`);
    const postLoginUrl = page.url();
    const meta = readSessionMeta(profileDir);
    writeSessionMeta(profileDir, {
      loginId: creds.loginId || meta?.loginId || "",
      portalType: portal.type,
      lastLoginAt: meta?.lastLoginAt || new Date().toISOString(),
      postLoginUrl,
      source: creds.source,
    });
    return;
  }

  if (!creds.loginId) {
    log("Digital Gujarat khula — login ID save karein ya browser me manually login karein");
  } else {
    log(`Login required → ${portal.loginUrl.split("/").pop()}`);
  }

  await navigateDg(page, portal.loginUrl, log, portal);
  await page.bringToFront().catch(() => {});
  await page.waitForTimeout(1000);

  if (isDgSessionActive(page.url(), portal.loginPagePattern)) {
    log("✓ Already logged in after redirect");
    if (creds.loginId) {
      writeSessionMeta(profileDir, buildSessionMeta(creds, portal.type, page.url()));
    }
    return;
  }

  log("Digital Gujarat portal khula — CAPTCHA, OTP, LOGIN browser me khud karein");
  if (reporter) {
    await reporter.flush({ currentStep: "DG portal open — login manually in browser (CAPTCHA + OTP)" });
  }

  if (isAutomationHeadless()) {
    log("⚠ VPS headless mode — browser dikhega nahi. Install: sudo apt install -y xvfb");
  }

  await waitForPortalLogin(
    page,
    async () => isDgSessionActive(page.url(), portal.loginPagePattern),
    log
  );

  await waitForContinueConfirm(
    page,
    `✓ ${portal.label} login ho gaya! Ab Continue dabayein — automation shuru hogi`,
    log,
    `${portal.label} — Ready`
  );

  if (creds.loginId) {
    writeSessionMeta(profileDir, buildSessionMeta(creds, portal.type, page.url()));
  }
  log(`✓ Login complete — agli baar seedha yahi page khulega (${page.url().split("/").pop()})`);
}

function buildSessionMeta(
  creds: DgCredentials,
  portalType: "sjed" | "citizen",
  postLoginUrl: string
): SessionMeta {
  return {
    loginId: creds.loginId || "manual",
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
