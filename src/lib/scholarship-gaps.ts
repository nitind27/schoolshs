export const PAPER_GAP_KEYS = [
  "aadhaar",
  "aadhaarDoc",
  "bank",
  "passbook",
  "casteName",
  "casteCert",
  "incomeCert",
  "mobile",
] as const;

export type PaperGapKey = (typeof PAPER_GAP_KEYS)[number];

export type PaperGapStudent = {
  category?: string | null;
  aadhaarNumber?: string | null;
  aadhaarDocPath?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  bankPassbookPath?: string | null;
  caste?: string | null;
  casteCertPath?: string | null;
  incomeCertPath?: string | null;
  mobileNumber?: string | null;
};

function filled(value: string | null | undefined): boolean {
  const s = String(value || "").trim();
  return Boolean(s) && s !== "—" && s !== "-" && s.toUpperCase() !== "NA";
}

export function casteProofRequired(category: string | null | undefined): boolean {
  const cat = String(category || "").trim().toUpperCase();
  if (!cat || cat === "OPEN" || cat === "GENERAL" || cat === "GEN") return false;
  return true;
}

export function scholarshipPaperGaps(student: PaperGapStudent): PaperGapKey[] {
  const gaps: PaperGapKey[] = [];
  const aadhaar = String(student.aadhaarNumber || "").replace(/\s/g, "");
  if (!/^\d{12}$/.test(aadhaar)) gaps.push("aadhaar");
  if (!filled(student.aadhaarDocPath)) gaps.push("aadhaarDoc");
  if (!filled(student.accountNumber) || !filled(student.ifscCode)) gaps.push("bank");
  if (!filled(student.bankPassbookPath)) gaps.push("passbook");
  if (casteProofRequired(student.category)) {
    if (!filled(student.caste)) gaps.push("casteName");
    if (!filled(student.casteCertPath)) gaps.push("casteCert");
  }
  if (!filled(student.incomeCertPath)) gaps.push("incomeCert");
  const mobile = String(student.mobileNumber || "").replace(/\D/g, "");
  if (mobile.length < 10) gaps.push("mobile");
  return gaps;
}
