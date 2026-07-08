import type { Page } from "playwright";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { DgPortalConfig } from "../src/lib/dg-portal";
import { isDgSessionActive } from "./session";
import { DG_OTP_SELECTORS } from "./selectors";
import type { LogFn } from "./form-filler";
import type { JobReporter } from "./status-reporter";

const OTP_PATTERN = /^\d{4,8}$/;

function extractOtp(text: string): string | null {
  const trimmed = text.trim();
  if (OTP_PATTERN.test(trimmed)) return trimmed;
  const match = trimmed.match(/\b(\d{6})\b/) || trimmed.match(/\b(\d{4,8})\b/);
  return match ? match[1] : null;
}

export async function isOtpDialogVisible(page: Page): Promise<boolean> {
  try {
    const body = await page.locator("body").innerText({ timeout: 2000 });
    const lower = body.toLowerCase();
    if (!lower.includes("otp")) return false;
    return (
      lower.includes("otp verify") ||
      lower.includes("enter otp") ||
      lower.includes("otp has been delivered") ||
      lower.includes("otp no")
    );
  } catch {
    return false;
  }
}

async function findOtpInput(page: Page) {
  for (const sel of DG_OTP_SELECTORS.otpInput) {
    try {
      const loc = page.locator(sel);
      const count = await loc.count();
      for (let i = 0; i < count; i++) {
        const input = loc.nth(i);
        if (await input.isVisible({ timeout: 300 })) return input;
      }
    } catch {
      continue;
    }
  }
  try {
    const byLabel = page.getByLabel(/enter otp/i).first();
    if (await byLabel.isVisible({ timeout: 500 })) return byLabel;
  } catch {
    /* ignore */
  }
  return null;
}

async function clickConfirm(page: Page): Promise<boolean> {
  for (const sel of DG_OTP_SELECTORS.confirmButton) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 800 })) {
        await btn.click();
        return true;
      }
    } catch {
      continue;
    }
  }
  try {
    const btn = page.getByRole("button", { name: /confirm/i }).first();
    if (await btn.isVisible({ timeout: 800 })) {
      await btn.click();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function fillOtpAndConfirm(page: Page, otp: string, log: LogFn): Promise<boolean> {
  const input = await findOtpInput(page);
  if (!input) {
    log("⚠ OTP input field not found");
    return false;
  }

  await input.click({ timeout: 2000 }).catch(() => {});
  await input.fill("");
  await input.fill(otp);
  log(`✓ OTP filled (${otp.slice(0, 2)}****)`);

  await page.waitForTimeout(400);

  if (await clickConfirm(page)) {
    log("✓ Confirm clicked");
    await page.waitForTimeout(2000);
    return true;
  }

  log("⚠ Confirm button not found — OTP filled, manually Confirm dabayein");
  return true;
}

async function readClipboardOtp(page: Page, lastSeen: string): Promise<{ otp: string | null; raw: string }> {
  try {
    const text = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return "";
      }
    });
    if (!text || text === lastSeen) return { otp: null, raw: text };
    const otp = extractOtp(text);
    return { otp, raw: text };
  } catch {
    return { otp: null, raw: lastSeen };
  }
}

async function readJobOtp(prisma: PrismaClient, jobId: string): Promise<string | null> {
  if (!jobId) return null;
  const job = await prisma.automationJob.findUnique({
    where: { id: jobId },
    select: { otpCode: true },
  });
  const code = job?.otpCode?.trim();
  if (!code || !OTP_PATTERN.test(code)) return null;
  await prisma.automationJob.update({
    where: { id: jobId },
    data: { otpCode: null },
  });
  return code;
}

async function readSmsInboxOtp(
  prisma: PrismaClient,
  schoolId: string,
  lastUsedOtp: string
): Promise<string | null> {
  if (!schoolId) return null;
  const msg = await prisma.smsInboxMessage.findFirst({
    where: { schoolId, consumed: false, otpCode: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!msg?.otpCode || msg.otpCode === lastUsedOtp) return null;
  await prisma.smsInboxMessage.update({
    where: { id: msg.id },
    data: { consumed: true },
  });
  return msg.otpCode;
}

/** CAPTCHA+LOGIN ke baad OTP screen — phone SMS inbox / dashboard / clipboard se auto-fill */
export async function waitForLoginWithOtpAutoFill(
  page: Page,
  portal: DgPortalConfig,
  prisma: PrismaClient,
  jobId: string,
  schoolId: string,
  log: LogFn,
  reporter: JobReporter | null,
  timeoutMs = 300000
): Promise<void> {
  log("⏳ CAPTCHA + LOGIN karein → OTP phone SMS se auto-fill hoga (website inbox connected)");
  const deadline = Date.now() + timeoutMs;
  let currentPage: Page = page;
  let otpAnnounced = false;
  let lastClipboard = "";
  let lastUsedOtp = "";
  let stable = 0;

  let lastHeartbeat = 0;

  function pickAnyOpenPage(fromPage: Page): Page | null {
    try {
      return fromPage.context().pages().find((p) => !p.isClosed()) || null;
    } catch {
      return null;
    }
  }

  while (Date.now() < deadline) {
    const now = Date.now();
    if (now - lastHeartbeat > 25000) {
      lastHeartbeat = now;
      log("⏳ Waiting: CAPTCHA/LOGIN/OTP… (manual may be required)");
      if (reporter) await reporter.flush({ currentStep: "Waiting: CAPTCHA/Login/OTP..." });
    }
    try {
      if (await isDgSessionActive(currentPage.url(), portal.loginPagePattern)) {
        stable++;
        if (stable >= 4) {
          log("✓ Login successful");
          if (reporter) await reporter.flush({ currentStep: "Login complete" });
          return;
        }
        await currentPage.waitForTimeout(500);
        continue;
      }
      stable = 0;

      if (await isOtpDialogVisible(currentPage)) {
      if (!otpAnnounced) {
        otpAnnounced = true;
        log("📱 OTP Verify screen detect — auto-fill shuru");
        if (reporter) {
          await reporter.flush({
            currentStep: "OTP required — phone SMS website par aayega, auto-fill hoga",
          });
        }
      }

      let otp: string | null = null;

      otp = await readSmsInboxOtp(prisma, schoolId, lastUsedOtp);
      if (otp) {
        log("✓ OTP phone SMS inbox se mila (website)");
      }

      if (!otp) {
        otp = await readJobOtp(prisma, jobId);
        if (otp && otp !== lastUsedOtp) log("✓ OTP dashboard se mila");
      }

      if (!otp) {
        const clip = await readClipboardOtp(currentPage, lastClipboard);
        lastClipboard = clip.raw;
        if (clip.otp && clip.otp !== lastUsedOtp) {
          otp = clip.otp;
          log("✓ OTP clipboard se detect hua");
        }
      }

      if (otp && otp !== lastUsedOtp) {
        const ok = await fillOtpAndConfirm(currentPage, otp, log);
        if (ok) {
          lastUsedOtp = otp;
          otpAnnounced = false;
          await currentPage.waitForTimeout(2500);
          continue;
        }
      }
      }

      await currentPage.waitForTimeout(450);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log(`⚠ OTP/Login loop error: ${errMsg}`);
      const replacement = pickAnyOpenPage(currentPage);
      if (replacement && replacement !== currentPage) {
        currentPage = replacement;
        stable = 0;
        otpAnnounced = false;
        continue;
      }
      throw err;
    }
  }

  throw new Error("Login timeout — CAPTCHA + LOGIN + OTP complete karein");
}
