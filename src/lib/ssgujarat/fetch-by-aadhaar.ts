import { chromium, type Page } from "playwright";
import { enrichRecordsWithProfiles } from "./fetch-by-child-uid";
import type { SsgujaratFetchResult, SsgujaratStudentRecord } from "./types";

const SS_GUJARAT_LOGIN = "https://www.ssgujarat.org/CTELogin.aspx";
const SS_GUJARAT_SEARCH = "https://www.ssgujarat.org/patrak3studentsearch.aspx";
const GRID_SELECTOR = "#ctl00_ContentPlaceHolder1_GridView2";
const AADHAAR_INPUT = "#ctl00_ContentPlaceHolder1_txtAadhaarNo";
const SEARCH_BTN = "#ctl00_ContentPlaceHolder1_btnSearch2";

function normalizeAadhaar(value: string): string {
  return value.replace(/\s/g, "").trim();
}

function aadhaarLast4(aadhaar: string): string {
  return normalizeAadhaar(aadhaar).slice(-4);
}

function maskedMatchesAadhaar(masked: string, aadhaar: string): boolean {
  const last4 = aadhaarLast4(aadhaar);
  const digits = masked.replace(/\D/g, "");
  return digits.endsWith(last4);
}

async function parseGrid(page: Page): Promise<SsgujaratStudentRecord[]> {
  const grid = page.locator(GRID_SELECTOR);
  const visible = await grid.isVisible({ timeout: 8000 }).catch(() => false);
  if (!visible) return [];

  const rows = grid.locator("tr").filter({
    has: page.locator('[id*="LBLStudentName"]'),
  });
  const count = await rows.count();
  const records: SsgujaratStudentRecord[] = [];

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const cells = (await row.locator("td").allInnerTexts()).map((c) => c.trim());

    if (cells.length < 12) continue;

    records.push({
      srNo: cells[0] || "",
      studentName: cells[1] || "",
      fatherName: cells[2] || "",
      motherName: cells[3] || "",
      surname: cells[4] || "",
      childUid: cells[5] || "",
      aadhaarMasked: cells[6] || "",
      dateOfBirth: cells[7] || "",
      entryDate: cells[8] || "",
      studyingClass: cells[9] || "",
      schoolCode: cells[10] || "",
      schoolName: cells[11] || "",
      principalName: cells[12] || "",
      principalMobile: cells[13] || "",
    });
  }

  return records.filter((r) => r.studentName && r.childUid);
}

export async function fetchSsgujaratByAadhaar(aadhaarNumber: string): Promise<SsgujaratFetchResult> {
  const searchedAadhaar = normalizeAadhaar(aadhaarNumber);

  if (!/^\d{12}$/.test(searchedAadhaar)) {
    throw new Error("Aadhaar number 12 digits hona chahiye");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(SS_GUJARAT_LOGIN, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.goto(SS_GUJARAT_SEARCH, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(AADHAAR_INPUT, { timeout: 20000 });
    await page.locator(AADHAAR_INPUT).scrollIntoViewIfNeeded();
    await page.fill(AADHAAR_INPUT, searchedAadhaar);
    await page.click(SEARCH_BTN);
    await page.waitForLoadState("networkidle", { timeout: 45000 });

    let records = await parseGrid(page);
    records = records.filter((r) => maskedMatchesAadhaar(r.aadhaarMasked, searchedAadhaar));

    if (records.length === 0) {
      const noData = await page
        .locator("text=/no record|not found|કોઈ રેકોર્ડ|મળ્યો નથી/i")
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      return {
        source: "ssgujarat.org",
        searchType: "aadhaar",
        searchId: searchedAadhaar,
        records: [],
        message: noData
          ? "SSGujarat par is Aadhaar ka koi record nahi mila"
          : "SSGujarat se data nahi mila — shayad Aadhaar galat hai ya portal par entry nahi hai",
      };
    }

    // Single match: load full student profile (DOB, gender, address, school details)
    if (records.length === 1 && records[0].childUid) {
      records = await enrichRecordsWithProfiles(browser, records, 1);
    }

    return {
      source: "ssgujarat.org",
      searchType: "aadhaar",
      searchId: searchedAadhaar,
      records,
      message:
        records.length > 1
          ? `${records.length} students mile — sahi wala select karein (last 4 digits match)`
          : undefined,
    };
  } finally {
    await browser.close();
  }
}
