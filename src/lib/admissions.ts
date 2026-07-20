/** Admission verification helpers */

export type AdmissionStatus = "pending" | "verified" | "rejected";

export type AdmissionStudentLike = {
  grNumber?: string | null;
  standard?: string | null;
  section?: string | null;
  classId?: string | null;
  rollNumber?: string | null;
  mobileNumber?: string | null;
  category?: string | null;
  aadhaarNumber?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  photoPath?: string | null;
  aadhaarDocPath?: string | null;
  incomeCertPath?: string | null;
  casteCertPath?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  dateOfBirth?: string | null;
  startDate?: string | null;
};

export type AdmissionCompleteness = {
  percent: number;
  missing: string[];
  level: "complete" | "partial" | "incomplete";
};

const CHECKS: { key: string; test: (s: AdmissionStudentLike) => boolean }[] = [
  { key: "grNumber", test: (s) => !!s.grNumber?.trim() },
  { key: "class", test: (s) => !!(s.standard?.trim() && s.section?.trim()) },
  { key: "rollNumber", test: (s) => !!s.rollNumber?.trim() },
  { key: "mobileNumber", test: (s) => !!s.mobileNumber?.trim() },
  { key: "aadhaarNumber", test: (s) => !!s.aadhaarNumber?.trim() },
  { key: "dateOfBirth", test: (s) => !!s.dateOfBirth?.trim() },
  { key: "fatherName", test: (s) => !!s.fatherName?.trim() },
  { key: "motherName", test: (s) => !!s.motherName?.trim() },
  { key: "photoPath", test: (s) => !!s.photoPath?.trim() },
  { key: "aadhaarDocPath", test: (s) => !!s.aadhaarDocPath?.trim() },
  { key: "incomeCertPath", test: (s) => !!s.incomeCertPath?.trim() },
  {
    key: "casteCertPath",
    test: (s) => {
      const cat = (s.category || "").toUpperCase();
      if (cat === "SC" || cat === "ST") return !!s.casteCertPath?.trim();
      return true;
    },
  },
  { key: "bankDetails", test: (s) => !!(s.bankName?.trim() && s.accountNumber?.trim() && s.ifscCode?.trim()) },
  { key: "startDate", test: (s) => !!s.startDate?.trim() },
];

export function computeAdmissionCompleteness(s: AdmissionStudentLike): AdmissionCompleteness {
  const missing: string[] = [];
  for (const { key, test } of CHECKS) {
    if (!test(s)) missing.push(key);
  }
  const done = CHECKS.length - missing.length;
  const percent = Math.round((done / CHECKS.length) * 100);
  const level = percent >= 90 ? "complete" : percent >= 60 ? "partial" : "incomplete";
  return { percent, missing, level };
}

export function classLabel(standard?: string | null, section?: string | null): string {
  if (!standard) return "—";
  return section ? `${standard}-${section}` : standard;
}

export function formatAdmissionDate(iso?: string | Date | null): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
