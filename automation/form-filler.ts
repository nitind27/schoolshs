import type { Page, Locator } from "playwright";
import { isAutomationHeadless } from "./headless";

export type LogFn = (msg: string) => void;

async function tryFill(locator: Locator, value: string, log: LogFn): Promise<boolean> {
  if (!value.trim()) return false;
  try {
    if (!(await locator.isVisible({ timeout: 500 }))) return false;
    const tag = await locator.evaluate((el) => el.tagName.toLowerCase());
    if (tag === "select") {
      await locator.selectOption({ label: value }).catch(async () => {
        await locator.selectOption({ value }).catch(async () => {
          await locator.selectOption({ index: 1 });
        });
      });
    } else {
      await locator.click({ timeout: 1000 });
      await locator.fill("");
      await locator.fill(value);
    }
    return true;
  } catch {
    return false;
  }
}

async function fillBySelectors(page: Page, selectors: string[], value: string, log: LogFn): Promise<boolean> {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await tryFill(loc, value, log)) {
      log(`✓ Filled via selector: ${sel.substring(0, 50)}`);
      return true;
    }
  }
  return false;
}

async function fillByLabel(page: Page, labelText: string, value: string, log: LogFn): Promise<boolean> {
  if (!value.trim()) return false;

  const strategies = [
    () => page.getByLabel(new RegExp(labelText, "i")).first(),
    () => page.locator(`label:has-text("${labelText}")`).locator("..").locator("input, textarea, select").first(),
    () => page.locator(`td:has-text("${labelText}")`).locator("~ td input, ~ td textarea, ~ td select").first(),
    () => page.locator(`span:has-text("${labelText}")`).locator("..").locator("input, textarea, select").first(),
    () => page.locator(`*:has-text("${labelText}")`).locator("xpath=following::input[1] | following::textarea[1] | following::select[1]").first(),
  ];

  for (const getLocator of strategies) {
    try {
      const loc = getLocator();
      if (await tryFill(loc, value, log)) {
        log(`✓ Filled "${labelText}" by label match`);
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

export async function fillTextFields(
  page: Page,
  mappings: { label: string; values: string[]; selectors?: string[] }[],
  log: LogFn
): Promise<number> {
  let filled = 0;

  for (const mapping of mappings) {
    const value = mapping.values.find((v) => v.trim()) || "";
    if (!value) continue;

    let success = false;
    if (mapping.selectors?.length) {
      success = await fillBySelectors(page, mapping.selectors, value, log);
    }
    if (!success) {
      success = await fillByLabel(page, mapping.label, value, log);
    }
    if (success) filled++;
    else log(`✗ Could not fill: ${mapping.label}`);
  }

  return filled;
}

export async function fillDropdowns(
  page: Page,
  student: Record<string, unknown>,
  dropdownMappings: { label: string; value: string; keywords: string[] }[],
  log: LogFn
): Promise<number> {
  let filled = 0;
  const selects = page.locator("select:visible");
  const count = await selects.count();

  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    try {
      const context = await select.evaluate((el) => {
        const row = el.closest("tr");
        const label = row?.querySelector("td, label, span")?.textContent?.toLowerCase() || "";
        const name = (el as HTMLSelectElement).name?.toLowerCase() || "";
        const id = (el as HTMLSelectElement).id?.toLowerCase() || "";
        return `${label} ${name} ${id}`;
      });

      for (const mapping of dropdownMappings) {
        const studentValue = String(student[mapping.value] || "");
        if (!studentValue) continue;

        const matches = mapping.keywords.some((kw) => context.includes(kw.toLowerCase()));
        if (matches) {
          await select.selectOption({ label: studentValue }).catch(async () => {
            await select.selectOption({ value: studentValue }).catch(async () => {
              const options = select.locator("option");
              const optCount = await options.count();
              for (let j = 0; j < optCount; j++) {
                const text = await options.nth(j).textContent();
                if (text?.toLowerCase().includes(studentValue.toLowerCase())) {
                  await select.selectOption({ index: j });
                  break;
                }
              }
            });
          });
          log(`✓ Dropdown: ${mapping.label} = ${studentValue}`);
          filled++;
          break;
        }
      }
    } catch {
      continue;
    }
  }

  return filled;
}

export async function fillRadioAndCheckboxes(
  page: Page,
  student: Record<string, unknown>,
  log: LogFn
): Promise<void> {
  if (student.gender) {
    const gender = String(student.gender);
    await page.locator(`input[type="radio"][value*="${gender}" i], label:has-text("${gender}") input`).first().check({ force: true }).catch(() => {});
    log(`✓ Gender: ${gender}`);
  }

  if (student.isHosteler) {
    await page.locator('label:has-text("Hostel") input, input[name*="Hostel" i]').first().check({ force: true }).catch(() => {});
    log("✓ Hosteler: Yes");
  }

  if (student.isOrphan) {
    await page.locator('label:has-text("Orphan") input, input[name*="Orphan" i]').first().check({ force: true }).catch(() => {});
    log("✓ Orphan: Yes");
  }
}

export async function uploadDocuments(
  page: Page,
  docs: { label: string; path: string }[],
  log: LogFn
): Promise<number> {
  let uploaded = 0;
  const fs = await import("fs");

  for (const doc of docs) {
    if (!doc.path || !fs.existsSync(doc.path)) {
      log(`⊘ Skip upload (file missing): ${doc.label}`);
      continue;
    }

    const fileInputs = page.locator('input[type="file"]:visible');
    const count = await fileInputs.count();

    for (let i = 0; i < count; i++) {
      const input = fileInputs.nth(i);
      try {
        const context = await input.evaluate((el) => {
          const row = el.closest("tr");
          const name = (el as HTMLInputElement).name?.toLowerCase() || "";
          return row?.textContent?.toLowerCase() || name;
        });

        if (context.includes(doc.label.toLowerCase()) || doc.label.toLowerCase().split(" ").some((w) => context.includes(w))) {
          await input.setInputFiles(doc.path);
          log(`✓ Uploaded: ${doc.label}`);
          uploaded++;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  return uploaded;
}

const OVERLAY_ID = "dg-automation-overlay";
const CONTINUE_BTN_ID = "dg-automation-continue-btn";

async function injectContinueOverlay(page: Page, message: string, stepLabel?: string) {
  await page.evaluate(
    ({ msg, step, overlayId, btnId }) => {
      document.getElementById(overlayId)?.remove();

      const overlay = document.createElement("div");
      overlay.id = overlayId;
      overlay.style.cssText = `
        position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;
        background:rgba(15,23,42,0.75);display:flex;align-items:flex-end;justify-content:center;
        font-family:system-ui,-apple-system,sans-serif;padding:24px;pointer-events:none;
      `;

      const card = document.createElement("div");
      card.style.cssText = `
        background:white;border-radius:16px;max-width:520px;width:100%;
        box-shadow:0 25px 50px rgba(0,0,0,0.35);overflow:hidden;pointer-events:auto;
        animation:dgSlideUp 0.3s ease-out;
      `;

      const style = document.createElement("style");
      style.textContent = `@keyframes dgSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`;
      document.head.appendChild(style);

      card.innerHTML = `
        <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:16px 20px;color:white">
          <div style="font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:0.05em">${step || "Scholarship Auto-Fill"}</div>
          <div style="font-size:17px;font-weight:700;margin-top:4px">Digital Gujarat Portal</div>
        </div>
        <div style="padding:20px">
          <p style="color:#334155;margin:0 0 16px;font-size:15px;line-height:1.5">${msg}</p>
          <button id="${btnId}" type="button" style="
            width:100%;padding:14px 20px;background:#16a34a;color:white;border:none;
            border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:8px;
          ">
            ✓ Ho Gaya — Continue
          </button>
          <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;text-align:center">
            Terminal/CMD me kuch nahi dabana — sirf ye button
          </p>
        </div>
      `;

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      (window as unknown as { __dgAutomationDone: boolean }).__dgAutomationDone = false;

      document.getElementById(btnId)?.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          (window as unknown as { __dgAutomationDone: boolean }).__dgAutomationDone = true;
          document.getElementById(overlayId)?.remove();
        },
        true
      );
    },
    { msg: message, step: stepLabel, overlayId: OVERLAY_ID, btnId: CONTINUE_BTN_ID }
  );
}

async function removeOverlay(page: Page) {
  await page.evaluate((id) => document.getElementById(id)?.remove(), OVERLAY_ID).catch(() => {});
}

/** Headless VPS par user click nahi kar sakta — overlay auto-continue */
async function autoContinueInHeadless(page: Page, log: LogFn, delayMs = 1500) {
  if (!isAutomationHeadless()) return;
  await page.waitForTimeout(delayMs);
  await page
    .evaluate(() => {
      (window as unknown as { __dgAutomationDone: boolean }).__dgAutomationDone = true;
      document.getElementById("dg-automation-overlay")?.remove();
    })
    .catch(() => {});
  log("▶ Headless VPS — Continue auto-clicked");
}

/** Login page free rehne do — overlay nahi, jab tak login complete na ho */
export async function waitForPortalLogin(
  page: Page,
  isLoggedIn: () => Promise<boolean>,
  log: LogFn,
  timeoutMs = 300000
): Promise<void> {
  log("⏳ Digital Gujarat portal me CAPTCHA + OTP + LOGIN karein — automation wait kar rahi hai");
  const deadline = Date.now() + timeoutMs;
  let stable = 0;

  while (Date.now() < deadline) {
    try {
      if (await isLoggedIn()) {
        stable++;
        if (stable >= 4) {
          await page.waitForLoadState("domcontentloaded").catch(() => {});
          await page.waitForTimeout(1000);
          log("✓ Login successful — ab Continue overlay dikhega");
          return;
        }
      } else {
        stable = 0;
      }
    } catch {
      stable = 0;
    }
    await page.waitForTimeout(500);
  }

  throw new Error("Login timeout — CAPTCHA + OTP + LOGIN complete karein");
}

/** Sirf login ke BAAD — user Continue dabaye, page refresh nahi hoga */
export async function waitForContinueConfirm(
  page: Page,
  message: string,
  log: LogFn,
  stepLabel?: string,
  timeoutMs = 120000
): Promise<void> {
  await removeOverlay(page);
  await injectContinueOverlay(page, message, stepLabel);
  log(`⏸ ${message}`);

  if (isAutomationHeadless()) {
    await autoContinueInHeadless(page, log);
    await removeOverlay(page);
    log("▶ Automation continue...");
    return;
  }

  try {
    await page.waitForFunction(
      () => (window as unknown as { __dgAutomationDone?: boolean }).__dgAutomationDone === true,
      { timeout: timeoutMs, polling: 200 }
    );
  } catch {
    log("⚠ Continue timeout — aage badh rahe hain");
  }

  await removeOverlay(page);
  log("▶ Automation continue...");
}

/** Wait for user — browser me "Continue" button, terminal Enter NOT needed */
export async function waitForUserAction(
  page: Page,
  message: string,
  log: LogFn,
  timeoutMs = 300000,
  options?: { stepLabel?: string; autoOnUrlLeave?: string }
): Promise<void> {
  log(`⏸ ${message}`);

  await injectContinueOverlay(page, message, options?.stepLabel);
  const startUrl = page.url();

  if (isAutomationHeadless()) {
    await autoContinueInHeadless(page, log);
    await removeOverlay(page);
    log("▶ Continuing automation...");
    return;
  }

  try {
    await Promise.race([
      page.waitForFunction(
        () => (window as unknown as { __dgAutomationDone?: boolean }).__dgAutomationDone === true,
        { timeout: timeoutMs, polling: 200 }
      ),
      options?.autoOnUrlLeave
        ? page
            .waitForFunction(
              (args: { start: string; leave: string }) => {
                const href = window.location.href;
                return href !== args.start && !href.includes(args.leave);
              },
              { start: startUrl, leave: options.autoOnUrlLeave },
              { timeout: timeoutMs, polling: 500 }
            )
            .then(async () => {
              log("✓ Auto-detected — aage badh rahe hain");
              await removeOverlay(page);
            })
        : new Promise(() => {}),
    ]);
  } catch {
    log("⚠ Timeout — aage badh rahe hain");
  }

  await removeOverlay(page);
  log("▶ Continuing automation...");
}
