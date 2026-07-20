import type { Student } from "@/generated/prisma/client";
import type { SsgujaratStudentRecord } from "./types";
import { pasteDataToRecord, type SsgPasteData } from "./parse-ssg-paste";
import { standardToCourseName, standardToCurrentYear } from "@/lib/constants";
import { bilingualNamePair } from "@/lib/gujarati/transliterate-core";

type StudentPartial = Partial<Student>;

function parseDobFromSsg(dob: string): string {
  const v = dob.trim();
  const maskedYear = v.match(/^X+\/X+\/(\d{4})$/i);
  if (maskedYear) return `01/07/${maskedYear[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  return v;
}

function titleCaseDistrict(value: string): string {
  return value
    .trim()
    .replace(/^\d+-/, "")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function mapSocialCategory(category: string): string | undefined {
  const c = category.trim().toUpperCase().replace(/^\d+-/, "");
  if (c.includes("SC")) return "SC";
  if (c.includes("ST")) return "ST";
  if (c.includes("OBC")) return "OBC";
  if (c.includes("SEBC")) return "SEBC";
  if (c.includes("GENERAL") || c === "OPEN") return "Open";
  return undefined;
}

function mapReligion(raw: string): string | undefined {
  const r = raw.replace(/^\d+-/, "").trim();
  const map: Record<string, string> = {
    muslim: "Muslim",
    hindu: "Hindu",
    christian: "Christian",
    sikh: "Sikh",
    buddhist: "Buddhist",
    jain: "Jain",
    parsi: "Parsi",
  };
  return map[r.toLowerCase()] || (r ? r.charAt(0).toUpperCase() + r.slice(1).toLowerCase() : undefined);
}

function mapGender(raw: string): string | undefined {
  const v = raw.toLowerCase();
  if (v.includes("boy") || v.includes("male")) return "Male";
  if (v.includes("girl") || v.includes("female")) return "Female";
  if (raw === "Male" || raw === "Female") return raw;
  return undefined;
}

function classToCourseType(classNum: number): string {
  if (classNum >= 11) return "Higher Secondary";
  if (classNum >= 9) return "Secondary";
  return "Secondary";
}

function splitAadhaarName(full: string, fallbackSurname: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(" ") || null,
      surname: parts[parts.length - 1],
    };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: null, surname: parts[1] };
  }
  return { firstName: parts[0] || full, middleName: null, surname: fallbackSurname };
}

function applyScholarshipScheme(mapped: StudentPartial, classNum: number) {
  const cat = mapped.category;
  if (classNum >= 1 && classNum <= 8) {
    if (cat === "SC") mapped.scholarshipScheme = "Pre Matric Scholarship - SC";
    else if (cat === "ST") mapped.scholarshipScheme = "Pre Matric Scholarship - ST";
  } else if (classNum >= 9) {
    if (cat === "SC") mapped.scholarshipScheme = "Post Matric Scholarship - SC";
    else if (cat === "ST") mapped.scholarshipScheme = "Post Matric Scholarship - ST";
    else if (cat === "OBC") mapped.scholarshipScheme = "Post Matric Scholarship - OBC";
    else if (cat === "SEBC") mapped.scholarshipScheme = "Post Matric Scholarship - SEBC";
  }
}

export function mapSsgujaratToStudent(
  record: SsgujaratStudentRecord,
  aadhaarNumber?: string
): StudentPartial {
  const classNum = parseInt(record.studyingClass, 10) || 0;
  const cleanAadhaar = (aadhaarNumber || record.aadhaarNumber || "").replace(/\s/g, "");
  const names = record.aadhaarName
    ? splitAadhaarName(record.aadhaarName, record.surname)
    : {
        firstName: record.studentName,
        middleName: record.fatherName || null,
        surname: record.surname,
      };

  const district = record.district ? titleCaseDistrict(record.district) : undefined;
  const address =
    record.addressLine ||
    [record.societyName, record.village, record.block, district].filter(Boolean).join(", ");
  const dob = record.dateOfBirth ? parseDobFromSsg(record.dateOfBirth) : "";

  const mapped: StudentPartial = {
    ...names,
    aadhaarName:
      record.aadhaarName ||
      [record.studentName, record.fatherName, record.surname].filter(Boolean).join(" "),
    ...(cleanAadhaar.length === 12 ? { aadhaarNumber: cleanAadhaar } : {}),
    ...(dob ? { dateOfBirth: dob } : {}),
    motherName: record.motherName || undefined,
    fatherName: record.fatherName || undefined,
    guardianName: record.guardianName || record.fatherName || undefined,
    mobileNumber: record.mobileNumber || undefined,
    email: record.email || undefined,
    institutionName: record.schoolName || undefined,
    institutionDistrict: district,
    currentDistrict: district,
    permanentDistrict: district,
    currentCity: record.village || record.block || undefined,
    permanentCity: record.village || record.block || undefined,
    currentPincode: record.pincode || undefined,
    permanentPincode: record.pincode || undefined,
    currentAddress: address ? `${address}, Gujarat` : undefined,
    permanentAddress: address ? `${address}, Gujarat` : undefined,
    courseName: classNum ? standardToCourseName(record.studyingClass) : undefined,
    courseType: classNum ? classToCourseType(classNum) : undefined,
    standard: record.studyingClass || undefined,
    section: record.section || undefined,
    grNumber: record.grNo || undefined,
    childUid: record.childUid || undefined,
    currentYear: classNum ? standardToCurrentYear(record.studyingClass) : undefined,
    board10th: "GSEB",
    financialYear: record.academicYear?.match(/^\d{4}-\d{2}$/) ? record.academicYear : "2025-26",
    gender: mapGender(record.gender || ""),
    religion: mapReligion(record.religion || ""),
    category: record.socialCategory ? mapSocialCategory(record.socialCategory) : undefined,
    caste: record.subCaste || undefined,
    residentType: /urban/i.test(record.habitation || "") ? "Urban" : "Rural",
    habitationType: "Own",
    startDate: record.admissionDate || undefined,
    bankName: record.bankName || undefined,
    branchName: record.branchName || undefined,
    accountNumber: record.accountNumber || undefined,
    ifscCode: record.ifscCode?.toUpperCase() || undefined,
    accountHolderName: record.accountHolderName || undefined,
    parentOccupation: "Agriculture/Labour",
    annualFamilyIncome: /yes|હા|1-/i.test(record.bpl || "") ? 50000 : 120000,
    familySize: 4,
    notes: [
      record.schoolCode ? `School Code: ${record.schoolCode}` : null,
      record.medium ? `Medium: ${record.medium}` : null,
    ]
      .filter(Boolean)
      .join(" | ") || undefined,
  };

  applyScholarshipScheme(mapped, classNum);

  const bilingualFields: (keyof StudentPartial)[] = [
    "firstName",
    "middleName",
    "surname",
    "aadhaarName",
    "motherName",
    "fatherName",
    "guardianName",
  ];
  for (const enKey of bilingualFields) {
    const enVal = mapped[enKey];
    if (typeof enVal === "string" && enVal.trim()) {
      const pair = bilingualNamePair(enVal);
      const rec = mapped as Record<string, string | null | undefined>;
      rec[enKey] = pair.en;
      rec[`${enKey}Gu`] = pair.gu;
    }
  }

  return mapped;
}

export function mapSsgPasteToStudent(paste: SsgPasteData): StudentPartial {
  const r = pasteDataToRecord(paste);
  const record: SsgujaratStudentRecord = {
    srNo: "1",
    studentName: r.studentName,
    fatherName: r.fatherName,
    motherName: r.motherName,
    surname: r.surname,
    childUid: r.childUid,
    aadhaarMasked: "",
    dateOfBirth: r.dateOfBirth,
    entryDate: "",
    studyingClass: r.studyingClass,
    schoolCode: "",
    schoolName: r.schoolName,
    principalName: "",
    principalMobile: "",
    gender: r.gender,
    religion: r.religion,
    socialCategory: r.socialCategory,
    district: r.district,
    block: r.block,
    village: r.village,
    grNo: r.grNo,
    section: r.section,
    previousClass: r.previousClass,
    medium: r.medium,
    bpl: r.bpl,
    pincode: r.pincode,
    addressLine: r.addressLine,
    guardianName: r.guardianName,
    habitation: r.habitation,
    aadhaarNumber: r.aadhaarNumber,
    aadhaarName: r.aadhaarName,
    admissionDate: r.admissionDate,
    bankName: r.bankName,
    accountNumber: r.accountNumber,
    accountHolderName: r.accountHolderName,
    branchName: r.branchName,
    ifscCode: r.ifscCode,
    mobileNumber: r.mobileNumber,
    email: r.email,
    subCaste: r.subCaste,
  };
  return mapSsgujaratToStudent(record, r.aadhaarNumber);
}

export function compactStudentPartial(data: StudentPartial): StudentPartial {
  const out: StudentPartial = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === "") continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function mergeStudentPartials(...parts: StudentPartial[]): StudentPartial {
  const out: StudentPartial = {};
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      if (value !== undefined && value !== null && value !== "") {
        (out as Record<string, unknown>)[key] = value;
      }
    }
  }
  return out;
}
