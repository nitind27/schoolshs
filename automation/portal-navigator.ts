import type { Page } from "playwright";
import type { LogFn } from "./form-filler";
import type { DgPortalConfig } from "../src/lib/dg-portal";
import { goToPortalEntry } from "./dg-nav";

export type ApplyActionMode = "auto" | "new_apply" | "edit";

const SCHOLARSHIP_LINK_PATTERNS = [
  /scholarship/i,
  /shishyavruti/i,
  /pre\s*matric/i,
  /post\s*matric/i,
  /mysy/i,
  /sjed/i,
];

const NEW_APPLY_PATTERNS = [
  /new\s*application/i,
  /new\s*apply/i,
  /apply\s*now/i,
  /fresh\s*application/i,
  /start\s*application/i,
  /apply\s*for/i,
];

const EDIT_PATTERNS = [
  /^edit$/i,
  /edit\s*application/i,
  /modify/i,
  /update\s*application/i,
  /continue\s*application/i,
  /incomplete/i,
  /draft/i,
];

const NEXT_PATTERNS = [
  'input[type="submit"][value*="Next" i]',
  'input[type="button"][value*="Next" i]',
  'input[id*="Next" i]',
  'input[id*="btnNext" i]',
  'button:has-text("Next")',
  'a:has-text("Next")',
  'input[value*="Save & Next" i]',
  'input[value*="Save and Next" i]',
];

const SUBMIT_PATTERNS = [
  'input[type="submit"][value*="Submit" i]',
  'input[type="submit"][value*="Final" i]',
  'button:has-text("Submit")',
  'input[id*="Submit" i]',
];

async function clickByPatterns(page: Page, patterns: (string | RegExp)[], log: LogFn): Promise<boolean> {
  for (const p of patterns) {
    try {
      if (typeof p === "string") {
        const loc = page.locator(p).first();
        if (await loc.isVisible({ timeout: 800 })) {
          await loc.click();
          log(`✓ Clicked: ${p.substring(0, 40)}`);
          return true;
        }
      } else {
        const link = page.getByRole("link", { name: p }).first();
        if (await link.isVisible({ timeout: 800 })) {
          await link.click();
          log(`✓ Clicked link: ${p}`);
          return true;
        }
        const btn = page.getByRole("button", { name: p }).first();
        if (await btn.isVisible({ timeout: 800 })) {
          await btn.click();
          log(`✓ Clicked button: ${p}`);
          return true;
        }
        const text = page.getByText(p).first();
        if (await text.isVisible({ timeout: 800 })) {
          await text.click();
          log(`✓ Clicked text: ${p}`);
          return true;
        }
      }
    } catch {
      continue;
    }
  }
  return false;
}

async function fillSearchAndGo(page: Page, term: string, log: LogFn): Promise<boolean> {
  const searchSelectors = [
    'input[type="search"]',
    'input[name*="Search" i]',
    'input[id*="Search" i]',
    'input[placeholder*="Search" i]',
    'input[placeholder*="Name" i]',
    'input[placeholder*="Aadhaar" i]',
  ];

  for (const sel of searchSelectors) {
    try {
      const input = page.locator(sel).first();
      if (await input.isVisible({ timeout: 1000 })) {
        await input.fill(term);
        log(`✓ Search filled: ${term.substring(0, 4)}***`);
        await page.keyboard.press("Enter").catch(() => {});
        await page.waitForTimeout(2000);

        if (await clickByPatterns(page, EDIT_PATTERNS, log)) return true;

        const row = page.locator(`tr:has-text("${term.substring(0, 6)}")`).first();
        if (await row.isVisible({ timeout: 2000 })) {
          const editInRow = row.locator('a:has-text("Edit"), input[value*="Edit" i], button:has-text("Edit")').first();
          if (await editInRow.isVisible({ timeout: 1000 })) {
            await editInRow.click();
            log("✓ Edit clicked from search row");
            return true;
          }
          await row.click();
          await page.waitForTimeout(1500);
          if (await clickByPatterns(page, EDIT_PATTERNS, log)) return true;
        }
      }
    } catch {
      continue;
    }
  }
  return false;
}

export async function goToPortalHome(page: Page, portal: DgPortalConfig, log: LogFn, profileDir?: string) {
  await goToPortalEntry(page, portal, log, profileDir);
}

export async function openScholarshipService(
  page: Page,
  portal: DgPortalConfig,
  scheme: string,
  log: LogFn,
  profileDir?: string
): Promise<boolean> {
  await goToPortalHome(page, portal, log, profileDir);

  for (const pattern of SCHOLARSHIP_LINK_PATTERNS) {
    if (scheme.toLowerCase().includes("pre matric") && !/pre|sjed|matric/i.test(pattern.source)) continue;
    if (scheme.toLowerCase().includes("post matric") && /sjed|pre/i.test(pattern.source)) continue;

    if (await clickByPatterns(page, [pattern], log)) {
      await page.waitForTimeout(2500);
      return true;
    }
  }

  if (await clickByPatterns(page, [/services/i, /apply for services/i, /citizen services/i], log)) {
    await page.waitForTimeout(2000);
    for (const pattern of SCHOLARSHIP_LINK_PATTERNS) {
      if (await clickByPatterns(page, [pattern], log)) {
        await page.waitForTimeout(2000);
        return true;
      }
    }
  }

  log("⚠ Scholarship service link auto-detect failed — manual navigation may be needed");
  return false;
}

export async function navigateToStudentForm(
  page: Page,
  student: Record<string, unknown>,
  actionMode: ApplyActionMode,
  log: LogFn,
  portal: DgPortalConfig,
  profileDir?: string
): Promise<{ action: "new_apply" | "edit" | "manual"; portalStatus?: string }> {
  const scheme = String(student.scholarshipScheme || "");
  const aadhaar = String(student.aadhaarNumber || "");
  const name = `${student.firstName || ""} ${student.surname || ""}`.trim();
  const searchTerm = aadhaar || name;

  await openScholarshipService(page, portal, scheme, log, profileDir);

  const tryEdit = actionMode === "auto" || actionMode === "edit";
  const tryNew = actionMode === "auto" || actionMode === "new_apply";

  if (tryEdit && searchTerm) {
    log(`Auto-search existing application: ${searchTerm.substring(0, 4)}***`);
    const found = await fillSearchAndGo(page, searchTerm, log);
    if (found) {
      await page.waitForTimeout(2000);
      const portalStatus = await scrapePortalStatus(page);
      log(`✓ Edit flow opened — portal status: ${portalStatus || "unknown"}`);
      return { action: "edit", portalStatus };
    }
    if (actionMode === "edit") {
      log("⚠ Edit requested but application not found in search");
      return { action: "manual", portalStatus: "not_found" };
    }
  }

  if (tryNew) {
    if (await clickByPatterns(page, NEW_APPLY_PATTERNS, log)) {
      await page.waitForTimeout(2500);
      log("✓ New Application flow opened");
      return { action: "new_apply", portalStatus: "new" };
    }
  }

  if (await clickByPatterns(page, [/my applications/i, /application status/i, /track application/i], log)) {
    await page.waitForTimeout(2000);
    if (searchTerm && (await fillSearchAndGo(page, searchTerm, log))) {
      return { action: "edit", portalStatus: await scrapePortalStatus(page) };
    }
  }

  log("⚠ Auto navigation incomplete — form page manually kholein");
  return { action: "manual" };
}

export async function scrapePortalStatus(page: Page): Promise<string | undefined> {
  try {
    const body = await page.locator("body").innerText();
    const statusMatch = body.match(/(?:status|application status)[:\s]*(draft|submitted|approved|rejected|pending|incomplete)/i);
    return statusMatch?.[1];
  } catch {
    return undefined;
  }
}

export async function autoClickNext(page: Page, log: LogFn): Promise<boolean> {
  const clicked = await clickByPatterns(page, NEXT_PATTERNS, log);
  if (clicked) {
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

export async function autoClickSubmit(page: Page, log: LogFn): Promise<boolean> {
  const clicked = await clickByPatterns(page, SUBMIT_PATTERNS, log);
  if (clicked) {
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}

export async function autoFillAllPages(
  page: Page,
  fillFn: () => Promise<void>,
  log: LogFn,
  maxPages = 8
): Promise<number> {
  let pagesDone = 0;
  for (let i = 0; i < maxPages; i++) {
    await fillFn();
    pagesDone++;

    const submitted = await autoClickSubmit(page, log);
    if (submitted) {
      log("✓ Auto-submit clicked");
      break;
    }

    const next = await autoClickNext(page, log);
    if (!next) {
      log(`Form step ${i + 1} — Next button not found, stopping auto-nav`);
      break;
    }
    log(`→ Auto-advanced to page ${i + 2}`);
  }
  return pagesDone;
}
