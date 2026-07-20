export interface PatrakCounts {
  boys: number;
  girls: number;
}

export type PatrakRowKey =
  | "fullFee"
  | "govtSc"
  | "govtSt"
  | "nomadicTribe"
  | "denotifiedTribe"
  | "baxiSocial"
  | "baxiEconomic"
  | "minorityReligious"
  | "minorityLinguistic"
  | "other"
  | "total";

export interface PatrakMovementRow {
  opening: PatrakCounts;
  admittedNew: number;
  transferPaid: number;
  transferUnpaid: number;
  schoolPaid: number;
  schoolUnpaid: number;
  classPaid: number;
  classUnpaid: number;
  closing: PatrakCounts;
  note: string;
}

export interface PatrakClassification {
  ujaniyat: number;
  madhyam: number;
  pachhat: number;
  groupTotal: number;
  other: { jain: number; parsi: number; muslim: number; sikh: number; christian: number; total: number };
  grandTotal: number;
  avgAttendance: number;
}

export const PATRAK_TYPE_ROWS: { key: PatrakRowKey; label: string; isGovtWaiver?: boolean }[] = [
  { key: "fullFee", label: "આખી ફી ભરનાર" },
  { key: "govtSc", label: "અનુસૂચિત જાતિ", isGovtWaiver: true },
  { key: "govtSt", label: "અનુસૂચિત જનજાતિ", isGovtWaiver: true },
  { key: "nomadicTribe", label: "વિચરતી જાતિ", isGovtWaiver: true },
  { key: "denotifiedTribe", label: "વિમુક્ત જાતિ", isGovtWaiver: true },
  { key: "baxiSocial", label: "બક્ષી (સામા. / શૈક્ષ)", isGovtWaiver: true },
  { key: "baxiEconomic", label: "બક્ષી (આર્થિક)", isGovtWaiver: true },
  { key: "minorityReligious", label: "લઘુમતિ (ધાર્મિક)", isGovtWaiver: true },
  { key: "minorityLinguistic", label: "લઘુમતિ (ભાષાકીય)", isGovtWaiver: true },
  { key: "other", label: "અન્ય :" },
  { key: "total", label: "કુલ :" },
];

export const PATRAK_GOVT_WAIVER_COUNT = PATRAK_TYPE_ROWS.filter((r) => r.isGovtWaiver).length;

export function emptyPatrakMovementRow(): PatrakMovementRow {
  const z = { boys: 0, girls: 0 };
  return {
    opening: { ...z },
    admittedNew: 0,
    transferPaid: 0,
    transferUnpaid: 0,
    schoolPaid: 0,
    schoolUnpaid: 0,
    classPaid: 0,
    classUnpaid: 0,
    closing: { ...z },
    note: "",
  };
}

export function emptyPatrakClassification(): PatrakClassification {
  return {
    ujaniyat: 0,
    madhyam: 0,
    pachhat: 0,
    groupTotal: 0,
    other: { jain: 0, parsi: 0, muslim: 0, sikh: 0, christian: 0, total: 0 },
    grandTotal: 0,
    avgAttendance: 0,
  };
}

export interface MonthlyPatrakData {
  month: string;
  year: string;
  standard: string;
  section: string;
  classTeacher: string;
  movement: Record<PatrakRowKey, PatrakMovementRow>;
  classification: PatrakClassification;
}

export interface ClassRegisterRow {
  grNumber: string;
  caste: string;
  category: string;
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
