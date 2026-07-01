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
    'input[name*="UserName"]',
    'input[id*="UserName"]',
    'input[name*="Login"]',
    'input[id*="txtUser"]',
    'input[type="text"]:visible',
  ],
  password: [
    'input[name*="Password"]',
    'input[id*="Password"]',
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
    'input[name*="UserName"]',
    'input[name*="Mobile"]',
    'input[name*="Email"]',
    'input[id*="UserName"]',
    'input[id*="txtMobile"]',
    'input[id*="txtEmail"]',
    'input[type="text"]:visible',
  ],
  password: [
    'input[name*="Password"]',
    'input[id*="Password"]',
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
    { label: "Annual Income", values: [String(student.annualFamilyIncome || "")], selectors: ['input[name*="Income"]', 'input[id*="Income"]'] },
    { label: "Family Size", values: [String(student.familySize || "")], selectors: ['input[name*="FamilySize"]', 'input[id*="FamilySize"]'] },
    { label: "Current Address", values: [String(student.currentAddress || "")], selectors: ['textarea[name*="Address"]', 'textarea[id*="Address"]'] },
    { label: "Pincode", values: [String(student.currentPincode || ""), String(student.permanentPincode || "")], selectors: ['input[name*="Pin"]', 'input[name*="Pincode"]', 'input[maxlength="6"]'] },
    { label: "Bank Name", values: [String(student.bankName || "")], selectors: ['input[name*="BankName"]', 'input[id*="BankName"]'] },
    { label: "Branch Name", values: [String(student.branchName || "")], selectors: ['input[name*="Branch"]', 'input[id*="Branch"]'] },
    { label: "Account Number", values: [String(student.accountNumber || "")], selectors: ['input[name*="Account"]', 'input[id*="Account"]'] },
    { label: "IFSC Code", values: [String(student.ifscCode || "")], selectors: ['input[name*="IFSC"]', 'input[id*="IFSC"]'] },
    { label: "Account Holder", values: [String(student.accountHolderName || "")], selectors: ['input[name*="AccountHolder"]', 'input[name*="Holder"]'] },
    { label: "10th Percentage", values: [String(student.percentage10th || "")], selectors: ['input[id*="Std10"]', 'input[name*="Percent10"]'] },
    { label: "12th Percentage", values: [String(student.percentage12th || "")], selectors: ['input[id*="Std12"]', 'input[name*="Percent12"]'] },
    { label: "Institution Name", values: [String(student.institutionName || "")], selectors: ['input[name*="Institution"]', 'input[name*="College"]'] },
    { label: "Course Name", values: [String(student.courseName || "")], selectors: ['input[name*="Course"]', 'input[id*="Course"]'] },
    { label: "Ration Card", values: [String(student.rationCardNumber || "")], selectors: ['input[name*="Ration"]', 'input[id*="Ration"]'] },
  ];
}

export const DG_DROPDOWN_MAPPINGS: { label: string; value: string; keywords: string[] }[] = [
  { label: "Gender", value: "gender", keywords: ["gender", "sex"] },
  { label: "Category", value: "category", keywords: ["category", "caste", "community"] },
  { label: "Religion", value: "religion", keywords: ["religion"] },
  { label: "District", value: "currentDistrict", keywords: ["district", "jilla"] },
  { label: "Course Type", value: "courseType", keywords: ["course type", "coursetype"] },
  { label: "Current Year", value: "currentYear", keywords: ["year", "semester"] },
  { label: "Board 10th", value: "board10th", keywords: ["board", "10th", "standard 10"] },
  { label: "Board 12th", value: "board12th", keywords: ["12th", "standard 12"] },
];
