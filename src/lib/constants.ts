export const GUJARAT_DISTRICTS = [
  "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch",
  "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka",
  "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch",
  "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal",
  "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar",
  "Tapi", "Vadodara", "Valsad",
];

/** Digital Gujarat scholarship categories (SC, ST, OBC, SEBC, EWS, Open, Minority, NTDNT) */
export const CATEGORIES = ["SC", "ST", "OBC", "SEBC", "EWS", "Open", "Minority", "NTDNT"] as const;

export const GENDERS = ["Male", "Female", "Other"] as const;

export const RELIGIONS = [
  "Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Parsi", "Other",
] as const;

export const SCHOLARSHIP_SCHEMES = [
  "Post Matric Scholarship - SC",
  "Post Matric Scholarship - ST",
  "Post Matric Scholarship - OBC",
  "Post Matric Scholarship - SEBC",
  "Pre Matric Scholarship - SC",
  "Pre Matric Scholarship - ST",
  "MYSY Scholarship",
  "Food Bill Assistance",
  "Instrument Assistance",
  "Research Scholarship",
] as const;

export const FINANCIAL_YEARS = [
  "2025-26", "2024-25", "2023-24",
] as const;

export const COURSE_TYPES = [
  "Medical", "Para-Medical", "Engineering", "Management", "Pharmacy",
  "Architecture", "Law", "Arts", "Commerce", "Science", "Diploma",
  "ITI", "Agriculture", "Nursing", "Secondary", "Higher Secondary", "Other",
] as const;

export const CURRENT_YEARS = [
  "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year",
] as const;

export const BOARDS = [
  "GSEB", "CBSE", "ICSE", "Gujarat University", "GTU", "Saurashtra University",
  "VNSGU", "MSU Baroda", "Other",
] as const;

export const SCHOOL_STANDARDS = [
  "Balvatika", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
] as const;

export const CLASS_SECTIONS = ["A", "B", "C", "D", "E", "F"] as const;
export const CLASS_STREAMS = ["Arts", "Commerce", "Science"] as const;

export function getRecommendedSectionsForStandard(standard: string): string[] {
  if (["6", "7", "8"].includes(standard)) return ["A", "B"];
  if (["9", "10"].includes(standard)) return ["A", "B", "C", "D"];
  if (["11", "12"].includes(standard)) return ["A", "B", "C", "D"];
  return ["A"];
}

export const STAFF_DESIGNATIONS = [
  "Principal",
  "Vice Principal",
  "Teacher",
  "Head Teacher",
  "Supervisor",
  "Clerk",
  "Peon",
  "Lab Assistant",
  "Librarian",
  "Accountant",
  "Other",
] as const;

export const STAFF_ROLE_WORK: Record<string, string[]> = {
  teacher: [
    "Teach subjects as per timetable and syllabus plan",
    "Maintain class discipline, attendance, and student learning records",
    "Assess students and coordinate with parents on progress",
  ],
  peon: [
    "Support daily school operations and classroom logistics",
    "Handle file/document movement and official internal deliveries",
    "Assist with campus upkeep, bell duties, and event arrangements",
  ],
  supervisor: [
    "Supervise daily operations, staff duties, and compliance tasks",
    "Monitor attendance, discipline, and process quality across sections",
    "Report issues to management and ensure timely execution of tasks",
  ],
};

export function getStaffRoleWork(designation: string | null | undefined): string[] {
  const normalized = String(designation || "").trim().toLowerCase();
  if (normalized === "teacher" || normalized === "head teacher") return STAFF_ROLE_WORK.teacher;
  if (normalized === "peon" || normalized === "puen") return STAFF_ROLE_WORK.peon;
  if (normalized === "supervisor") return STAFF_ROLE_WORK.supervisor;
  return [];
}

export const BLOOD_GROUPS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
] as const;

export const STUDENT_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-700" },
  { value: "ready", label: "Ready", color: "bg-blue-100 text-blue-700" },
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  { value: "submitted", label: "Submitted", color: "bg-green-100 text-green-700" },
  { value: "approved", label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
] as const;

export const CSV_HEADERS = [
  "firstName", "middleName", "surname", "aadhaarName", "dateOfBirth", "gender",
  "aadhaarNumber", "rationCardNumber", "mobileNumber", "email", "motherName",
  "fatherName", "guardianName", "category", "caste", "religion", "maritalStatus",
  "parentOccupation", "isOrphan", "annualFamilyIncome", "currentAddress",
  "currentDistrict", "currentCity", "currentPincode", "permanentAddress",
  "permanentDistrict", "permanentCity", "permanentPincode", "habitationType",
  "familySize", "residentType", "isHosteler", "hostelType", "hostelName",
  "scholarshipScheme", "financialYear", "courseType", "courseName",
  "institutionDistrict", "institutionName", "currentYear", "admissionType",
  "startDate", "completionDate", "board10th", "percentage10th", "year10th",
  "board12th", "percentage12th", "year12th", "previousQualification",
  "bankName", "branchName", "accountNumber", "ifscCode", "accountHolderName",
  "rollNumber", "grNumber", "standard", "section", "childUid", "bloodGroup",
] as const;

export const CSV_HEADER_LABELS: Record<string, string> = {
  firstName: "First Name",
  middleName: "Middle Name",
  surname: "Surname",
  aadhaarName: "Name (As per Aadhaar)",
  dateOfBirth: "Date of Birth (DD/MM/YYYY)",
  gender: "Gender",
  aadhaarNumber: "Aadhaar Number",
  rationCardNumber: "Ration Card Number",
  mobileNumber: "Mobile Number",
  email: "Email",
  motherName: "Mother Name",
  fatherName: "Father Name",
  guardianName: "Guardian Name",
  category: "Category (SC/ST/OBC/SEBC/EWS/Open)",
  caste: "Caste",
  religion: "Religion",
  maritalStatus: "Marital Status",
  parentOccupation: "Parent Occupation",
  isOrphan: "Is Orphan (Yes/No)",
  annualFamilyIncome: "Annual Family Income",
  currentAddress: "Current Address",
  currentDistrict: "Current District",
  currentCity: "Current City",
  currentPincode: "Current Pincode",
  permanentAddress: "Permanent Address",
  permanentDistrict: "Permanent District",
  permanentCity: "Permanent City",
  permanentPincode: "Permanent Pincode",
  habitationType: "Habitation Type (Own/Rent)",
  familySize: "Family Size",
  residentType: "Resident Type (Rural/Urban)",
  isHosteler: "Is Hosteler (Yes/No)",
  hostelType: "Hostel Type",
  hostelName: "Hostel Name",
  scholarshipScheme: "Scholarship Scheme",
  financialYear: "Financial Year",
  courseType: "Course Type",
  courseName: "Course Name",
  institutionDistrict: "Institution District",
  institutionName: "Institution Name",
  currentYear: "Current Year",
  admissionType: "Admission Type",
  startDate: "Course Start Date",
  completionDate: "Course Completion Date",
  board10th: "10th Board",
  percentage10th: "10th Percentage",
  year10th: "10th Year",
  board12th: "12th Board",
  percentage12th: "12th Percentage",
  year12th: "12th Year",
  previousQualification: "Previous Qualification",
  bankName: "Bank Name",
  branchName: "Branch Name",
  accountNumber: "Account Number",
  ifscCode: "IFSC Code",
  accountHolderName: "Account Holder Name",
  rollNumber: "Roll Number",
  grNumber: "GR / Admission Number",
  standard: "Standard (Class)",
  section: "Section",
  childUid: "SSG Child UID (18 digit)",
  bloodGroup: "Blood Group",
};

export function standardToCourseName(standard: string): string {
  if (!standard) return "";
  if (standard === "Balvatika") return "Balvatika";
  return `Class ${standard}`;
}

export function standardToCurrentYear(standard: string): string {
  const n = parseInt(standard, 10);
  if (isNaN(n) || n < 1) return "1st Year";
  const map = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
  return map[Math.min(n - 1, 4)] || "1st Year";
}
