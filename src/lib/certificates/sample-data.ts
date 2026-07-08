import type { LCData } from "@/components/certificates/leaving-certificate";
import type {
  MonthlyPatrakData,
  ClassRegisterRow,
  ScholarshipReportRow,
  AdmissionReportRow,
  LeaverReportRow,
} from "@/lib/certificates/types";

export const SAMPLE_STUDENT = {
  firstName: "RIYA",
  middleName: "BHARATBHAI",
  surname: "PATEL",
  grNumber: "1245",
  dateOfBirth: "15/08/2010",
  gender: "Female",
  standard: "10",
  section: "A",
  religion: "Hindu",
  caste: "Patel",
  motherName: "KIRANBEN",
  currentCity: "Fort-Songadh",
  currentDistrict: "Tapi",
  childUid: "123456789012345678",
  category: "OBC",
};

export const SAMPLE_BONAFIDE = {
  student: SAMPLE_STUDENT,
  serialNo: "378",
  issueDate: "06/07/2026",
};

export const SAMPLE_LC: LCData = {
  student: SAMPLE_STUDENT,
  serialNo: "245",
  lastSchool: "SARVAJANIK HIGHSCHOOL, FORT-SONGADH",
  admissionDate: "15/06/2015 (Std 1)",
  leavingDate: "31/05/2026",
  studyingStandard: "Std 10-A",
  studyingSince: "June 2015",
  reason: "Further Education",
  progress: "Good",
  conduct: "Good",
  remarks: "Appeared in S.S.C. Exam March 2026",
  sscExam: "2026",
  sscSeatNo: "K-123456",
  issueDate: "06/07/2026",
};

export const SAMPLE_CHARACTER = {
  student: SAMPLE_STUDENT,
  grNumber: "1245",
  academicYear: "2025-26",
  examName: "GSEB S.S.C. March 2026",
  examResult: "First Trial",
  issueDate: "06/07/2026",
};

const zero = { boys: 0, girls: 0 };

export const SAMPLE_PATRAK: MonthlyPatrakData = {
  month: "7",
  year: "2026",
  standard: "10",
  section: "A",
  classTeacher: "શ્રી રમેશભાઈ પટેલ",
  opening: {
    fullFee: { boys: 18, girls: 15 },
    schoolWaiver: zero,
    govtSt: { boys: 2, girls: 1 },
    govtSc: { boys: 1, girls: 2 },
    govtPoor: zero,
    govtObc: { boys: 3, girls: 2 },
    total: { boys: 24, girls: 20 },
  },
  admitted: {
    newPaid: { boys: 1, girls: 0 },
    newUnpaid: zero,
    transferPaid: zero,
    transferUnpaid: zero,
  },
  left: {
    schoolPaid: { boys: 0, girls: 1 },
    schoolUnpaid: zero,
    classPaid: zero,
    classUnpaid: zero,
  },
  change: { boys: 1, girls: -1 },
  closing: { boys: 25, girls: 19 },
  caste: {
    sc: { boys: 1, girls: 2 },
    st: { boys: 2, girls: 1 },
    vj: zero,
    obc: { boys: 3, girls: 2 },
    hindu: { boys: 20, girls: 16 },
    muslim: { boys: 3, girls: 2 },
    sikh: zero,
    parsi: zero,
    christian: { boys: 1, girls: 1 },
  },
  avgAttendance: { boys: 22, girls: 18 },
  workingDays: { full: 26, half: 0, sundays: 4, holidays: 1, prevTotal: 156, monthTotal: 26, cumulative: 182 },
  fees: {
    schoolCount: 44, schoolRs: 8800, schoolPs: 0,
    termCount: 44, termRs: 4400, termPs: 0,
    otherCount: 5, otherRs: 500, otherPs: 0,
    arrearsSchool: 200, arrearsTerm: 100,
  },
  date: "06/07/2026",
};

const SAMPLE_NAMES = [
  "PATEL RIYA BHARATBHAI", "SHAH HARDIK KIRANBHAI", "DESAI PRIYA RAJESHBHAI",
  "VANKAR AMIT KANTIBHAI", "CHAUHAN KAVYA NARESHBHAI", "TADVI ROHIT RAMSING",
  "GAMIT SNEHA ARVINDBHAI", "SOLANKI JAY DIPAKBHAI",
];

export const SAMPLE_CLASS_REGISTER: ClassRegisterRow[] = SAMPLE_NAMES.map((name, i) => ({
  grNumber: String(1200 + i),
  caste: ["Patel", "Shah", "Desai", "Vankar", "Chauhan", "Tadvi", "Gamit", "Solanki"][i],
  dob: `${String(10 + i).padStart(2, "0")}/0${(i % 6) + 3}/2010`,
  schoolFee: "200", termFee: "100", admissionFee: "", otherFee: "", totalFee: "300",
  serial: i + 1,
  name,
  attendance: Array.from({ length: 31 }, (_, d) => (d < 26 ? (d % 7 === 0 ? "A" : "P") : "")),
  monthTotal: "22", prevTotal: "120", cumulative: "142", note: "",
}));

export const SAMPLE_CLASS_REGISTER_META = { month: "7", standard: "10", section: "A" };

export const SAMPLE_SCHOLARSHIP: ScholarshipReportRow[] = [
  { grNumber: "1201", name: "TADVI ROHIT RAMSING", waiverType: "સરકારી માફી (ST)", standard: "10-A", conduct: "સારી", presentDays: "24" },
  { grNumber: "1205", name: "GAMIT SNEHA ARVINDBHAI", waiverType: "શિષ્યવૃત્તિ", standard: "10-A", conduct: "સારી", presentDays: "25" },
  { grNumber: "1208", name: "VANKAR AMIT KANTIBHAI", waiverType: "સરકારી માફી (SC)", standard: "10-A", conduct: "સારી", presentDays: "23" },
];

export const SAMPLE_ADMISSIONS: AdmissionReportRow[] = [
  { serial: 1, grNumber: "1250", name: "MEHTA KRUNAL JAYESHBHAI", admissionDate: "05/06/2026", note: "નવો દાખલ" },
  { serial: 2, grNumber: "1251", name: "RATHOD DIPTI MAHESHBHAI", admissionDate: "10/06/2026", note: "" },
];

export const SAMPLE_LEAVERS: LeaverReportRow[] = [
  { serial: 1, grNumber: "1180", name: "JOSHI MITALI RAJUBHAI", leavingDate: "15/06/2026", reason: "શિક્ષણ પૂર્ણ", standard: "12-Sci", conduct: "સારી", feePaid: "હા", outstanding: "0", note: "" },
];
