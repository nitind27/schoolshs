import { chromium, type Browser } from "playwright";
import { parseStudentProfilePage, mergeSsgRecords } from "./parse-profile";
import type { SsgujaratFetchResult, SsgujaratStudentRecord } from "./types";

const SS_GUJARAT_LOGIN = "https://www.ssgujarat.org/CTELogin.aspx";
const UID_INPUT = "#TxtSearch";
const UID_SEARCH_BTN = "#BtnSearch";

function normalizeId(value: string): string {
  return value.replace(/\s/g, "").trim();
}

export async function fetchProfileForChildUid(
  browser: Browser,
  childUid: string
): Promise<SsgujaratStudentRecord | null> {
  const page = await browser.newPage();
  try {
    await page.goto(SS_GUJARAT_LOGIN, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(UID_INPUT, { timeout: 20000 });
    await page.fill(UID_INPUT, childUid);

    const popupPromise = page.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
    await page.click(UID_SEARCH_BTN);
    const popup = await popupPromise;
    const target = popup || page;

    return await parseStudentProfilePage(target);
  } finally {
    await page.close();
  }
}

export async function enrichRecordsWithProfiles(
  browser: Browser,
  records: SsgujaratStudentRecord[],
  maxEnrich = 1
): Promise<SsgujaratStudentRecord[]> {
  const out: SsgujaratStudentRecord[] = [];
  for (let i = 0; i < records.length; i++) {
    const base = records[i];
    if (i < maxEnrich && base.childUid?.length === 18) {
      const profile = await fetchProfileForChildUid(browser, base.childUid);
      out.push(profile ? mergeSsgRecords(base, profile) : base);
    } else {
      out.push(base);
    }
  }
  return out;
}

export async function fetchSsgujaratByChildUid(childUid: string): Promise<SsgujaratFetchResult> {
  const searchId = normalizeId(childUid);

  if (!/^\d{18}$/.test(searchId)) {
    throw new Error("Child UID 18 digits hona chahiye");
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const record = await fetchProfileForChildUid(browser, searchId);

    if (!record) {
      return {
        source: "ssgujarat.org",
        searchType: "childUid",
        searchId,
        records: [],
        message: "SSGujarat par is 18-digit Child UID ka record nahi mila",
      };
    }

    return {
      source: "ssgujarat.org",
      searchType: "childUid",
      searchId,
      records: [record],
    };
  } finally {
    await browser.close();
  }
}
