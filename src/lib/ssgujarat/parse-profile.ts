import type { Page } from "playwright";
import type { SsgujaratStudentRecord } from "./types";

function titleCaseDistrict(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeDob(raw: string): string {
  const v = raw.trim();
  if (!v || /^X+\/X+\/X+$/i.test(v)) return "";
  const maskedYear = v.match(/^X+\/X+\/(\d{4})$/i);
  if (maskedYear) return `01/07/${maskedYear[1]}`;
  return v;
}

function estimateDobFromClass1Entry(academicYear: string): string {
  const start = parseInt(academicYear.split("-")[0], 10);
  if (!Number.isFinite(start)) return "";
  return `01/07/${start - 6}`;
}

async function readProfileFields(page: Page) {
  return page.evaluate(() => {
    const g = (id: string) => {
      const el = document.getElementById(id);
      return el ? (el.textContent || "").trim() : "";
    };

    let class1AcademicYear = "";
    const history = document.getElementById("GvReport");
    if (history) {
      for (const row of history.querySelectorAll("tr")) {
        const cells = Array.from(row.querySelectorAll("td")).map((td) => (td.textContent || "").trim());
        if (cells.length >= 6 && cells[5] === "1") {
          class1AcademicYear = cells[0].replace(/[+−]/g, "").trim();
          break;
        }
      }
    }

    return {
      academicYear: g("lblacademicYear"),
      studentName: g("lblstudentname"),
      fatherName: g("lblfathername"),
      motherName: g("lblmothername"),
      surname: g("lblsurname"),
      grNo: g("lblgrno"),
      childUid: g("lblchilduniqueid"),
      schoolName: g("lblschoolname"),
      schoolCode: g("lbldisecode2"),
      district: g("lbldistrictname"),
      block: g("lblblockname"),
      cluster: g("lblclustername"),
      village: g("lblvillagename"),
      management: g("lblMgt"),
      schoolCategory: g("LblSchCat"),
      dateOfBirth: g("lbldob"),
      gender: g("lblgender"),
      religion: g("lblreligion"),
      socialCategory: g("lblsocialcategory"),
      bpl: g("lblbpl"),
      disability: g("lbldisability"),
      homeless: g("lblHomeless"),
      studyingClass: g("lblcurrentstd"),
      section: g("lblClsSection"),
      previousClass: g("lblpriviousstd"),
      medium: g("lblmedium"),
      attendance: g("lblattendance"),
      freeEducation: g("lblwhethergettingfreeeducation"),
      entryDate: g("lblLastUpdated"),
      class1AcademicYear,
    };
  });
}

export async function parseStudentProfilePage(page: Page): Promise<SsgujaratStudentRecord | null> {
  await page.waitForLoadState("domcontentloaded", { timeout: 45000 });
  await page.waitForSelector("#lblstudentname, #lblchilduniqueid", { timeout: 15000 }).catch(() => {});

  const f = await readProfileFields(page);
  if (!f.studentName && !f.childUid) return null;

  let dateOfBirth = normalizeDob(f.dateOfBirth);
  let dobEstimated = false;
  if (!dateOfBirth && f.class1AcademicYear) {
    dateOfBirth = estimateDobFromClass1Entry(f.class1AcademicYear);
    dobEstimated = Boolean(dateOfBirth);
  }

  return {
    srNo: "1",
    studentName: f.studentName,
    fatherName: f.fatherName,
    motherName: f.motherName,
    surname: f.surname,
    childUid: f.childUid,
    aadhaarMasked: "",
    dateOfBirth,
    entryDate: f.entryDate,
    studyingClass: f.studyingClass,
    schoolCode: f.schoolCode,
    schoolName: f.schoolName,
    principalName: "",
    principalMobile: "",
    gender: f.gender,
    religion: f.religion,
    socialCategory: f.socialCategory,
    district: titleCaseDistrict(f.district),
    block: f.block,
    village: f.village,
    cluster: f.cluster,
    grNo: f.grNo,
    academicYear: f.academicYear,
    section: f.section,
    previousClass: f.previousClass,
    medium: f.medium,
    management: f.management,
    schoolCategory: f.schoolCategory,
    bpl: f.bpl,
    disability: f.disability,
    freeEducation: f.freeEducation,
    habitation: /urban/i.test(f.homeless || "") ? "2-Urban" : "",
    dobEstimated,
  };
}

export function mergeSsgRecords(
  base: SsgujaratStudentRecord,
  profile: SsgujaratStudentRecord
): SsgujaratStudentRecord {
  return {
    ...base,
    ...profile,
    aadhaarMasked: base.aadhaarMasked || profile.aadhaarMasked,
    dateOfBirth: profile.dateOfBirth || base.dateOfBirth,
    principalName: base.principalName || profile.principalName,
    principalMobile: base.principalMobile || profile.principalMobile,
    entryDate: profile.entryDate || base.entryDate,
    dobEstimated: profile.dobEstimated ?? base.dobEstimated,
  };
}
