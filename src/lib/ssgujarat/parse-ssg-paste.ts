/** Parse SSGujarat school portal copy-paste export (Gujarati numbered form) */

export interface SsgPasteData {
  admissionNo?: string;
  rollNo?: string;
  studentName?: string;
  fatherName?: string;
  motherName?: string;
  surname?: string;
  guardianName?: string;
  habitation?: string;
  district?: string;
  block?: string;
  village?: string;
  houseNo?: string;
  societyName?: string;
  landmark?: string;
  area?: string;
  pincode?: string;
  childUid?: string;
  motherTongue?: string;
  dateOfBirth?: string;
  admissionDate?: string;
  gender?: string;
  socialCategory?: string;
  subCaste?: string;
  religion?: string;
  aadhaarNumber?: string;
  aadhaarName?: string;
  bpl?: string;
  currentClass?: string;
  section?: string;
  previousClass?: string;
  medium?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  branchName?: string;
  ifscCode?: string;
  mobileNumber?: string;
  email?: string;
  schoolName?: string;
}

function pick(text: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = text.match(p);
    const v = m?.[1]?.trim();
    if (v && v !== "----Select----" && !v.includes("Select")) return v;
  }
  return "";
}

/** Match top-level field number only (avoid 9.2 matching field 2) */
function field(text: string, num: number | string, extra = ""): string {
  const n = String(num).replace(".", "\\.");
  return pick(text, [
    new RegExp(`(?:^|\\n)\\s*${n}\\)[^\\n]*${extra}\\n([^\\n]+)`, "i"),
  ]);
}

function cleanDistrict(raw: string): string {
  return raw.replace(/^\d+-/, "").trim();
}

export function parseSsgGujaratPaste(raw: string): SsgPasteData {
  const text = raw.replace(/\r/g, "");

  return {
    admissionNo: field(text, 1),
    rollNo: field(text, 2),
    studentName: field(text, 3) || pick(text, [/બાળકનું નામ[^\n]*\n([^\n]+)/i]),
    fatherName: field(text, 4) || pick(text, [/પિતાનું નામ[^\n]*\n([^\n]+)/i]),
    motherName: field(text, 5) || pick(text, [/માતાનું નામ[^\n]*\n([^\n]+)/i]),
    surname: field(text, 6) || pick(text, [/બાળકની અટક[^\n]*\n([^\n]+)/i]),
    guardianName: field(text, 7) || pick(text, [/વાલી[^\n]*\n([^\n]+)/i]),
    habitation: field(text, 8) || pick(text, [/હેબિટેશન[^\n]*\n([^\n]+)/i]),
    district: cleanDistrict(field(text, "9.1") || pick(text, [/જિલ્લો[^\n]*\n([^\n]+)/i])),
    block: field(text, "9.2") || pick(text, [/તાલુકો[^\n]*\n([^\n]+)/i]),
    village: field(text, "9.3") || pick(text, [/ગામ[^\n]*\n([^\n]+)/i]),
    houseNo: field(text, "9.4"),
    societyName: field(text, "9.5") || pick(text, [/વસાહત[^\n]*\n([^\n]+)/i]),
    landmark: field(text, "9.6"),
    area: field(text, "9.7"),
    pincode: field(text, "9.8", "") || pick(text, [/પીન કોડ[^\n]*\n(\d{6})/i]) || pick(text, [/(?:^|\n)\s*9\.8\)[^\n]*\n(\d{6})/]),
    childUid: field(text, 10) || pick(text, [/(\d{18})/]),
    motherTongue: field(text, 11),
    dateOfBirth: field(text, 12) || pick(text, [/(\d{2}\/\d{2}\/\d{4})/]),
    admissionDate: field(text, 13),
    gender: field(text, 14),
    socialCategory: field(text, 15),
    subCaste: field(text, 16),
    religion: field(text, 17),
    aadhaarNumber: field(text, 18) || pick(text, [/(?:^|\n)\s*18\)[^\n]*\n(\d{12})/]),
    aadhaarName: field(text, 19),
    bpl: field(text, 21),
    currentClass: field(text, 26) || pick(text, [/(?:^|\n)\s*26\)[^\n]*\n(\d+)/]),
    section: field(text, 27),
    previousClass: field(text, 29),
    medium: field(text, 34) || pick(text, [/Gujarati|English|Hindi/i]),
    bankName: field(text, 60),
    accountNumber: field(text, 61),
    accountHolderName: field(text, 62),
    branchName: field(text, 63),
    ifscCode: field(text, 64) || pick(text, [/([A-Z]{4}0[A-Z0-9]{6})/i]),
    mobileNumber: field(text, 71) || pick(text, [/([6-9]\d{9})/]),
    email: field(text, 73) || pick(text, [/([^\s@]+@[^\s\n]+)/]),
  };
}

export function pasteDataToRecord(paste: SsgPasteData) {
  const addressParts = [paste.societyName, paste.landmark, paste.area, paste.village, paste.block]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  return {
    studentName: paste.studentName || "",
    fatherName: paste.fatherName || "",
    motherName: paste.motherName || "",
    surname: paste.surname || "",
    childUid: paste.childUid || "",
    dateOfBirth: paste.dateOfBirth || "",
    studyingClass: paste.currentClass || "",
    schoolName: paste.schoolName || "",
    gender: paste.gender || "",
    religion: paste.religion?.replace(/^\d+-/, "").trim(),
    socialCategory: paste.socialCategory?.replace(/^\d+-/, "").trim(),
    district: paste.district,
    block: paste.block,
    village: paste.village,
    grNo: paste.admissionNo,
    section: paste.section,
    previousClass: paste.previousClass,
    medium: paste.medium,
    bpl: paste.bpl,
    pincode: paste.pincode,
    addressLine: addressParts.join(", "),
    guardianName: paste.guardianName,
    habitation: paste.habitation,
    aadhaarNumber: paste.aadhaarNumber,
    aadhaarName: paste.aadhaarName,
    admissionDate: paste.admissionDate,
    bankName: paste.bankName,
    accountNumber: paste.accountNumber,
    accountHolderName: paste.accountHolderName,
    branchName: paste.branchName,
    ifscCode: paste.ifscCode?.toUpperCase(),
    mobileNumber: paste.mobileNumber,
    email: paste.email,
    subCaste: paste.subCaste?.replace(/^\d+-/, "").trim(),
  };
}
