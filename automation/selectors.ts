export const DG_URLS = {
  /** Citizen portal only — SJED school login ke liye use NA karein (ErrorPage redirect) */
  home: "https://www.digitalgujarat.gov.in/HomePage.aspx",
  errorPage: "https://www.digitalgujarat.gov.in/ErrorPage.aspx",
  citizenLogin: "https://www.digitalgujarat.gov.in/loginapp/CitizenLogin.aspx",
  sjedLogin: "https://www.digitalgujarat.gov.in/loginapp/SJEDLogin.aspx",
  /** @deprecated use getDgPortalConfig(scheme).loginUrl */
  login: "https://www.digitalgujarat.gov.in/loginapp/CitizenLogin.aspx",
  citizenPortal: "https://www.digitalgujarat.gov.in/CitizenPortal/",
};

/** SJED (Pre-Matric) — username/password focused, mobile/email radio optional */
export const SJED_LOGIN_SELECTORS = {
  username: [
    'input[name*="UserName" i]',
    'input[name*="UserNm" i]',
    'input[id*="UserName" i]',
    'input[id*="UserNm" i]',
    'input[name*="Login" i]',
    'input[id*="txtUser" i]',
    'input[type="text"]:visible',
  ],
  password: [
    'input[name*="Password" i]',
    'input[id*="Password" i]',
    'input[type="password"]',
  ],
  loginButton: [
    'input[type="submit"][value*="Login"]',
    'button:has-text("Login")',
    'input[id*="Login"]',
    'input[type="submit"]',
  ],
};

/** Digital Gujarat OTP Verify dialog (SJED + Citizen) */
export const DG_OTP_SELECTORS = {
  otpInput: [
    'input[id*="OTP" i]',
    'input[id*="otp" i]',
    'input[name*="OTP" i]',
    'input[name*="otp" i]',
    'input[placeholder*="OTP" i]',
    'input[maxlength="6"]',
    'input[maxlength="8"]',
  ],
  confirmButton: [
    'input[type="submit"][value*="Confirm" i]',
    'input[value="Confirm"]',
    'button:has-text("Confirm")',
    'input[id*="Confirm" i]',
    'input[id*="btnConfirm" i]',
  ],
};

export const DG_LOGIN_SELECTORS = {
  loginMethodSelect: [
    "#ctl00_ContentPlaceHolder1_DropDownList1",
    'select[id*="LoginType" i]',
    'select[name*="LoginType" i]',
    'select:has(option:has-text("Mobile No"))',
  ],
  mobileRadio: [
    'input[type="radio"][value*="Mobile"]',
    'input[id*="Mobile"]',
    'label:has-text("Mobile") input',
    '#rbMobile',
  ],
  emailRadio: [
    'input[type="radio"][value*="Email"]',
    'input[id*="Email"]',
    'label:has-text("Email") input',
  ],
  username: [
    'input[name*="UserName" i]',
    'input[name*="UserNm" i]',
    'input[name*="Mobile" i]',
    'input[name*="Email" i]',
    'input[id*="UserName" i]',
    'input[id*="UserNm" i]',
    'input[id*="txtMobile" i]',
    'input[id*="txtEmail" i]',
    'input[type="text"]:visible',
  ],
  password: [
    'input[name*="Password" i]',
    'input[id*="Password" i]',
    'input[type="password"]',
  ],
  captcha: [
    'input[name*="Captcha"]',
    'input[id*="Captcha"]',
    'input[name*="captcha"]',
  ],
  loginButton: [
    'input[type="submit"][value*="Login"]',
    'button:has-text("Login")',
    'input[id*="Login"]',
    'a:has-text("Login")',
  ],
};

export type FieldMapping = {
  label: string;
  values: string[];
  selectors?: string[];
};

export function buildFieldMappings(student: Record<string, unknown>): FieldMapping[] {
  const fullName = `${student.firstName} ${student.middleName || ""} ${student.surname}`.replace(/\s+/g, " ").trim();

  return [
    { label: "First Name", values: [String(student.firstName || "")], selectors: ['input[name*="First"]', 'input[id*="First"]', 'input[name*="fname"]'] },
    { label: "Middle Name", values: [String(student.middleName || "")], selectors: ['input[name*="Middle"]', 'input[id*="Middle"]'] },
    { label: "Surname", values: [String(student.surname || "")], selectors: ['input[name*="Last"]', 'input[name*="Surname"]', 'input[id*="Last"]'] },
    { label: "Aadhaar Name", values: [String(student.aadhaarName || fullName)], selectors: ['input[id*="AadhaarName"]', 'input[name*="AadhaarName"]'] },
    { label: "Aadhaar Number", values: [String(student.aadhaarNumber || "")], selectors: ['input[name*="Aadhaar"]', 'input[id*="Aadhaar"]', 'input[maxlength="12"]'] },
    { label: "Date of Birth", values: [String(student.dateOfBirth || "")], selectors: ['input[name*="DOB"]', 'input[name*="Birth"]', 'input[id*="DOB"]'] },
    { label: "Mobile", values: [String(student.mobileNumber || "")], selectors: ['input[name*="Mobile"]', 'input[id*="Mobile"]', 'input[type="tel"]'] },
    { label: "Email", values: [String(student.email || "")], selectors: ['input[name*="Email"]', 'input[type="email"]'] },
    { label: "Mother Name", values: [String(student.motherName || "")], selectors: ['input[name*="Mother"]', 'input[id*="Mother"]'] },
    { label: "Father Name", values: [String(student.fatherName || "")], selectors: ['input[name*="Father"]', 'input[id*="Father"]'] },
    { label: "Guardian Name", values: [String(student.guardianName || "")], selectors: ['input[name*="Guardian"]', 'input[id*="Guardian"]'] },
    { label: "Caste", values: [String(student.caste || "")], selectors: ['input[name*="Caste"]', 'input[id*="Caste"]'] },
    { label: "Parent Occupation", values: [String(student.parentOccupation || "")], selectors: ['input[name*="Occupation"]', 'input[id*="Occupation"]'] },
    { label: "Annual Income", values: [String(student.annualFamilyIncome || "")], selectors: ['input[name*="Income"]', 'input[id*="Income"]'] },
    { label: "Family Size", values: [String(student.familySize || "")], selectors: ['input[name*="FamilySize"]', 'input[id*="FamilySize"]'] },
    { label: "GR Number", values: [String(student.grNumber || "")], selectors: ['input[name*="GR" i]', 'input[id*="GR" i]', 'input[name*="GeneralRegister" i]'] },
    { label: "Roll Number", values: [String(student.rollNumber || "")], selectors: ['input[name*="Roll" i]', 'input[id*="Roll" i]'] },
    { label: "Child UID", values: [String(student.childUid || "")], selectors: ['input[name*="ChildUID" i]', 'input[id*="ChildUID" i]'] },
    { label: "APAAR ID", values: [String(student.apaarId || "")], selectors: ['input[name*="APAAR" i]', 'input[id*="APAAR" i]', 'input[name*="UPPAR" i]'] },
    { label: "Current Address", values: [String(student.currentAddress || "")], selectors: ['textarea[name*="Address"]', 'textarea[id*="Address"]'] },
    { label: "Current City", values: [String(student.currentCity || "")], selectors: ['input[name*="CurrentCity" i]', 'input[id*="CurrentCity" i]'] },
    { label: "Current Pincode", values: [String(student.currentPincode || "")], selectors: ['input[name*="CurrentPin" i]', 'input[id*="CurrentPin" i]'] },
    { label: "Permanent Address", values: [String(student.permanentAddress || "")], selectors: ['textarea[name*="PermanentAddress" i]', 'textarea[id*="PermanentAddress" i]'] },
    { label: "Permanent City", values: [String(student.permanentCity || "")], selectors: ['input[name*="PermanentCity" i]', 'input[id*="PermanentCity" i]'] },
    { label: "Permanent Pincode", values: [String(student.permanentPincode || "")], selectors: ['input[name*="PermanentPin" i]', 'input[id*="PermanentPin" i]'] },
    { label: "Bank Name", values: [String(student.bankName || "")], selectors: ['input[name*="BankName"]', 'input[id*="BankName"]'] },
    { label: "Branch Name", values: [String(student.branchName || "")], selectors: ['input[name*="Branch"]', 'input[id*="Branch"]'] },
    { label: "Account Number", values: [String(student.accountNumber || "")], selectors: ['input[name*="Account"]', 'input[id*="Account"]'] },
    { label: "IFSC Code", values: [String(student.ifscCode || "")], selectors: ['input[name*="IFSC"]', 'input[id*="IFSC"]'] },
    { label: "Account Holder", values: [String(student.accountHolderName || "")], selectors: ['input[name*="AccountHolder"]', 'input[name*="Holder"]'] },
    { label: "10th Percentage", values: [String(student.percentage10th || "")], selectors: ['input[id*="Std10"]', 'input[name*="Percent10"]'] },
    { label: "12th Percentage", values: [String(student.percentage12th || "")], selectors: ['input[id*="Std12"]', 'input[name*="Percent12"]'] },
    { label: "10th Passing Year", values: [String(student.year10th || "")], selectors: ['input[name*="Year10" i]', 'input[id*="Year10" i]'] },
    { label: "12th Passing Year", values: [String(student.year12th || "")], selectors: ['input[name*="Year12" i]', 'input[id*="Year12" i]'] },
    { label: "SSC Seat Number", values: [`${student.sscSeatPrefix || ""}${student.sscSeatNumber || ""}`], selectors: ['input[name*="SSCSeat" i]', 'input[id*="SSCSeat" i]'] },
    { label: "HSC Seat Number", values: [`${student.hscSeatPrefix || ""}${student.hscSeatNumber || ""}`], selectors: ['input[name*="HSCSeat" i]', 'input[id*="HSCSeat" i]'] },
    { label: "Scholarship Scheme", values: [String(student.scholarshipScheme || "")], selectors: ['select[name*="Scheme" i]', 'select[id*="Scheme" i]'] },
    { label: "Financial Year", values: [String(student.financialYear || "")], selectors: ['select[name*="FinancialYear" i]', 'select[id*="FinancialYear" i]'] },
    { label: "Institution Name", values: [String(student.institutionName || "")], selectors: ['input[name*="Institution"]', 'input[name*="College"]'] },
    { label: "Institution District", values: [String(student.institutionDistrict || "")], selectors: ['select[name*="InstitutionDistrict" i]', 'select[id*="InstitutionDistrict" i]'] },
    { label: "Course Name", values: [String(student.courseName || "")], selectors: ['input[name*="Course"]', 'input[id*="Course"]'] },
    { label: "Course Start Date", values: [String(student.startDate || "")], selectors: ['input[name*="StartDate" i]', 'input[id*="StartDate" i]'] },
    { label: "Course Completion Date", values: [String(student.completionDate || "")], selectors: ['input[name*="CompletionDate" i]', 'input[id*="CompletionDate" i]'] },
    { label: "Previous Qualification", values: [String(student.previousQualification || "")], selectors: ['input[name*="PreviousQualification" i]', 'input[id*="PreviousQualification" i]'] },
    { label: "Ration Card", values: [String(student.rationCardNumber || "")], selectors: ['input[name*="Ration"]', 'input[id*="Ration"]'] },
    { label: "PAN Number", values: [String(student.panNumber || "")], selectors: ['input[name*="PAN" i]', 'input[id*="PAN" i]'] },
  ];
}

export const DG_DROPDOWN_MAPPINGS: { label: string; value: string; keywords: string[] }[] = [
  { label: "Gender", value: "gender", keywords: ["gender", "sex"] },
  { label: "Category", value: "category", keywords: ["category", "caste", "community"] },
  { label: "Religion", value: "religion", keywords: ["religion"] },
  { label: "District", value: "currentDistrict", keywords: ["district", "jilla"] },
  { label: "Permanent District", value: "permanentDistrict", keywords: ["permanent district"] },
  { label: "Marital Status", value: "maritalStatus", keywords: ["marital"] },
  { label: "Resident Type", value: "residentType", keywords: ["resident", "rural", "urban"] },
  { label: "Habitation Type", value: "habitationType", keywords: ["habitation", "house type"] },
  { label: "Scholarship Scheme", value: "scholarshipScheme", keywords: ["scheme", "scholarship"] },
  { label: "Financial Year", value: "financialYear", keywords: ["financial year", "academic year"] },
  { label: "Course Type", value: "courseType", keywords: ["course type", "coursetype"] },
  { label: "Course Name", value: "courseName", keywords: ["course name", "class name"] },
  { label: "Current Year", value: "currentYear", keywords: ["year", "semester"] },
  { label: "Admission Type", value: "admissionType", keywords: ["admission type"] },
  { label: "Institution District", value: "institutionDistrict", keywords: ["institution district", "college district"] },
  { label: "Board 10th", value: "board10th", keywords: ["board", "10th", "standard 10"] },
  { label: "Board 12th", value: "board12th", keywords: ["12th", "standard 12"] },
];
