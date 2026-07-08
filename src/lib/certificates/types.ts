export interface PatrakCounts {
  boys: number;
  girls: number;
}

export interface MonthlyPatrakData {
  month: string;
  year: string;
  standard: string;
  section: string;
  classTeacher: string;
  opening: { fullFee: PatrakCounts; schoolWaiver: PatrakCounts; govtSt: PatrakCounts; govtSc: PatrakCounts; govtPoor: PatrakCounts; govtObc: PatrakCounts; total: PatrakCounts };
  admitted: { newPaid: PatrakCounts; newUnpaid: PatrakCounts; transferPaid: PatrakCounts; transferUnpaid: PatrakCounts };
  left: { schoolPaid: PatrakCounts; schoolUnpaid: PatrakCounts; classPaid: PatrakCounts; classUnpaid: PatrakCounts };
  change: PatrakCounts;
  closing: PatrakCounts;
  caste: { sc: PatrakCounts; st: PatrakCounts; vj: PatrakCounts; obc: PatrakCounts; hindu: PatrakCounts; muslim: PatrakCounts; sikh: PatrakCounts; parsi: PatrakCounts; christian: PatrakCounts };
  avgAttendance: PatrakCounts;
  workingDays: { full: number; half: number; sundays: number; holidays: number; prevTotal: number; monthTotal: number; cumulative: number };
  fees: { schoolCount: number; schoolRs: number; schoolPs: number; termCount: number; termRs: number; termPs: number; otherCount: number; otherRs: number; otherPs: number; arrearsSchool: number; arrearsTerm: number };
  date: string;
}

export interface ClassRegisterRow {
  grNumber: string;
  caste: string;
  dob: string;
  schoolFee: string;
  termFee: string;
  admissionFee: string;
  otherFee: string;
  totalFee: string;
  serial: number;
  name: string;
  attendance: (string | null)[];
  monthTotal: string;
  prevTotal: string;
  cumulative: string;
  note: string;
}

export interface ScholarshipReportRow {
  grNumber: string;
  name: string;
  waiverType: string;
  standard: string;
  conduct: string;
  presentDays: string;
}

export interface AdmissionReportRow {
  serial: number;
  grNumber: string;
  name: string;
  admissionDate: string;
  note: string;
}

export interface LeaverReportRow {
  serial: number;
  grNumber: string;
  name: string;
  leavingDate: string;
  reason: string;
  standard: string;
  conduct: string;
  feePaid: string;
  outstanding: string;
  note: string;
}

export const GUJARATI_MONTHS = [
  "જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન",
  "જુલાઈ", "ઑગસ્ટ", "સપ્ટેમ્બર", "ઑક્ટોબર", "નવેમ્બર", "ડિસેમ્બર",
] as const;

export const ENGLISH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
