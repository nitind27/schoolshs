/** SSA Gujarat (ssgujarat.org) — student record */

export type SsgujaratSearchType = "aadhaar" | "childUid";

export interface SsgujaratStudentRecord {
  srNo: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  surname: string;
  childUid: string;
  aadhaarMasked: string;
  dateOfBirth: string;
  entryDate: string;
  studyingClass: string;
  schoolCode: string;
  schoolName: string;
  principalName: string;
  principalMobile: string;
  gender?: string;
  religion?: string;
  socialCategory?: string;
  district?: string;
  block?: string;
  village?: string;
  cluster?: string;
  grNo?: string;
  academicYear?: string;
  section?: string;
  previousClass?: string;
  medium?: string;
  management?: string;
  schoolCategory?: string;
  bpl?: string;
  disability?: string;
  freeEducation?: string;
  dobEstimated?: boolean;
  /** From school paste export */
  pincode?: string;
  addressLine?: string;
  societyName?: string;
  guardianName?: string;
  habitation?: string;
  aadhaarNumber?: string;
  aadhaarName?: string;
  admissionDate?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  branchName?: string;
  ifscCode?: string;
  mobileNumber?: string;
  email?: string;
  subCaste?: string;
}

export interface SsgujaratFetchResult {
  source: "ssgujarat.org";
  searchType: SsgujaratSearchType;
  searchId: string;
  records: SsgujaratStudentRecord[];
  message?: string;
}
