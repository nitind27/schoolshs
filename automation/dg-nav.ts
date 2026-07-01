import type { Page } from "playwright";
import type { DgPortalConfig } from "../src/lib/dg-portal";
import {
  isDgErrorUrl,
  isDgSessionActive,
  isLoginUrl,
  isBlankOrInvalidUrl,
  readSessionMeta,
} from "../src/lib/dg-session";
import type { LogFn } from "./form-filler";

export async function navigateDg(
  page: Page,
  url: string,
  log: LogFn,
  portal?: DgPortalConfig
): Promise<void> {
  const tryGoto = async (waitUntil: "domcontentloaded" | "load" = "domcontentloaded") => {
    await page.goto(url, { waitUntil, timeout: 90000 });
  };

  try {
    await tryGoto();
  } catch {
    log(`⚠ Navigation retry: ${url.split("/").pop()}`);
    await tryGoto("load").catch((err) => {
      log(`❌ Could not open ${url}: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  await page.waitForTimeout(2000);

  if (isBlankOrInvalidUrl(page.url())) {
    log(`⚠ Still blank after goto — forcing ${url.split("/").pop()}`);
    await tryGoto("load").catch(() => {});
    await page.waitForTimeout(2000);
  }

  if (!isDgErrorUrl(page.url())) return;

  const recovery = portal?.loginUrl || url;
  log(`⚠ ErrorPage.aspx — recovering via ${recovery.split("/").pop()}`);
  await tryGoto().catch(() => {});
  await page.waitForTimeout(2000);
}

export async function goToPortalEntry(
  page: Page,
  portal: DgPortalConfig,
  log: LogFn,
  profileDir?: string
): Promise<void> {
  const meta = profileDir ? readSessionMeta(profileDir) : null;

  if (
    meta?.postLoginUrl &&
    meta.portalType === portal.type &&
    !isBlankOrInvalidUrl(meta.postLoginUrl) &&
    !isDgErrorUrl(meta.postLoginUrl)
  ) {
    log(`✓ Saved session restore → ${meta.postLoginUrl.split("/").pop()}`);
    await navigateDg(page, meta.postLoginUrl, log, portal);
    if (isDgSessionActive(page.url(), portal.loginPagePattern)) return;
    log("⚠ Saved session expired — login page khulega");
  }

  if (isDgSessionActive(page.url(), portal.loginPagePattern)) {
    log(`✓ Already on active ${portal.type} portal page`);
    return;
  }

  if (isDgErrorUrl(page.url())) {
    log("⚠ ErrorPage detected — correct login page khulega");
  }

  log(`Opening ${portal.label} → ${portal.loginUrl.split("/").pop()}`);
  await navigateDg(page, portal.loginUrl, log, portal);
}

export function needsLogin(page: Page, portal: DgPortalConfig): boolean {
  const url = page.url();
  if (isBlankOrInvalidUrl(url)) return true;
  return isDgErrorUrl(url) || isLoginUrl(url, portal.loginPagePattern);
}
